#!/usr/bin/env node

require("./requireExtensions");

var Mite = require("./mite"),
	program = require("commander"),
	path = require("path"),
	colors = require("colors"),
	exec = require("child_process").exec,
	fs = require("fs"),
	q = require("q"),
	mitePackage = require(path.join(__dirname, "../", "package.json")),
	MigrationProvider = require("./migrationProvider");

colors.setTheme({
	success: "green",
	warn: "yellow",
	error: "red",
	info: "underline"
});

var miteRoot = getMiteRoot(process.cwd()),
	mite = null;
process.setMaxListeners(0);

//TODO: allow mite init without a mite root
if (!miteRoot) {
	console.log("fatal: not a mite project (or any of the parent directories): mite.config".error);
	process.exit(1);
}

var config = JSON.parse(fs.readFileSync(path.join(miteRoot, "mite.config"), "utf8"));
mite = new Mite(config);



program
	.version(mitePackage.version);

program
	.command("status")
	.description("show migratrion status")
	.action(function () {
		mite.connect().then(function () {
			mite._requireInit().then(function () {
				status(mite).then(forceExit, handleError);
			}, handleUninitialized);
		}, connectionError);
	});

program
	.command("init")
	.description("init the _migration table and migrations directory")
	.action(function () {
		mite.connect().then(function () {
			init(mite).then(forceExit, handleError);
		}, connectionError);
	});

program
	.command("up")
	.description("run all unexecuted migrations")
	.action(function () {
		mite.connect().then(function () {
			mite._requireInit().then(function () {
				up(mite).then(forceExit, handleError);
			}, handleUninitialized);
		}, connectionError);
	});

/*
	TODO: I would rather the syntax be "mite step up", "mite step down", "mite step to 2014-02-18T05:29:39.686Z", etc...
	investigate the best way to configure sub commands.
*/
program
	.command("stepup")
	.description("run the first unexecuted migration")
	.action(function() {
		mite.connect().then(function() {
			mite._requireInit().then(function() {
				stepUp(mite).then(forceExit, handleError);
			}, handleUninitialized);
		}, connectionError);
	});

program
	.command("stepdown")
	.description("step down one migration from the current head")
	.action(function() {
		mite.connect().then(function() {
			mite._requireInit().then(function() {
				stepDown(mite).then(forceExit, handleError);
			}, handleUninitialized);
		}, connectionError);
	});


program
	.command("create")
	.description("create a new (empty) migration file")
	.action(function() {
		create().then(forceExit, handleError);
	});

program
	.command("help")
	.description("display usage information")
	.action(function() {
		program.help();
	});

program
	.command("audit")
	.description("determine what's wrong with your schema")
	.action(function(){
		var tasks = [];
		//Dump the current schema without data
		tasks.push(mite.dumpSchema("current.sql").then(function(){
			console.log("current schema dumped")
		}))
		//Drop mite_tmp.  Up from scratch in mite_tmp
		//Dump mite_tmp
		var tmpConfig = config;
		tmpConfig.database = undefined;
		mite = new Mite(tmpConfig);
		

		tasks.push(
			mite.createSchema("mite_tmp").then(function(){
				tmpConfig.database = "mite_tmp";
				mite = new Mite(tmpConfig);
				return init(mite).then(function(){
					return up(mite).then(function(){
						return mite.dumpSchema("proper.sql").then(function(){
							return mite.dropSchema("mite_tmp");
						})						
					})
				})
			})	
		);
		//Do a diff
		return q.all(tasks).then(function(){
			exec('diff -C 5 proper.sql current.sql', function(err, stdout, stderr){
				if (err){
					console.error(err)
				}
				fs.unlinkSync("current.sql");
				fs.unlinkSync("proper.sql");
				if (stdout){
					console.log(stdout.error);	
				}else{
					console.log("Successful audit, database and migrations are in sync.".success);
				}
				forceExit();
			})	
		});
	})
program.parse(process.argv);

function getMiteRoot(dir) {
	var prev = null;

	while (prev !== "/" && dir !== "/") {
		var files = fs.readdirSync(dir);

		if (files.some(function (x) {
			return x === "mite.config";
		})) {
			return dir;
		} else {
			prev = dir;
			dir = path.join(dir, "../");
		}
	}

	return null;
}

function forceExit(code) {
	process.exit(code || 0);
}

function handleError(err) {
	if (err) {
		console.log(("FATAL:" + err).error);
		process.exit(1);
	}
}

function connectionError(err) {
	if(err) {
		console.log(("Mite Connection Error: " + err).error);
		process.exit(1);
	}
}

function handleUninitialized() {
	console.log("fatal: not in an initialized mite project".error);
	process.exit(1);
}

function create() {
	var migrationRoot = path.join(miteRoot, "migrations");
	var isoString = (new Date()).toISOString();
	var filename = (isoString.substring(0, isoString.lastIndexOf(".")) + "Z").replace(/\:/g, "-") + ".sql";

	try {
		fs.writeFileSync(path.join(migrationRoot, filename), require("../templates/migration.sql"));
		console.log(("migration created: " + filename).success);
	} catch(e) {
		console.log((e.toString()).error);
	}
	return q.resolve();
}

function status(api) {
	var provider = new MigrationProvider(path.join(miteRoot, "migrations"));

	return api.status(provider.getMigrations()).then(function (miteStatus) {
		if (miteStatus.clean) {
			console.log("clean".success);
		} else {
			if(miteStatus.dirtyMigrations) {
				printMigrationList("dirty migrations:".info, miteStatus.dirtyMigrations, "error");
			}

			if(miteStatus.unexecutedMigrations) {
				printMigrationList("unexecuted migrations:".info, miteStatus.unexecutedMigrations, "warn");
			}
		}
	}, handleError);
}

function printMigrationList(header, migrations, migrationLevel) {
	console.log(header);
	migrations.forEach(function (m) {
		console.log(("\t" + m)[migrationLevel]);
	});
}


function init(api) {
	return api.init().then(
		function (initStatus) {
			if (initStatus.alreadyInitialized) {
				console.log("_migration table already exists...skipping".warn);
			} else if (initStatus.initialized) {
				console.log("_migration table created...".success);
			} else {
				console.log("fatal: could not create the _migration table".error);
			}

			// create migrations directory
			var migrationsPath = path.join(miteRoot, "migrations");

			if (fs.existsSync(migrationsPath)) {
				var stats = fs.lstatSync(migrationsPath);

				if (!stats.isDirectory()) {
					console.error(("fatal: 'migrations' exists at the mite root, but it is not a directory (" + migrationsPath + ").").error);
					process.exit(1);
				}

				console.info("'migrations' directory exists...skipping".warn);
			} else {
				fs.mkdirSync(migrationsPath);
				console.info("'migrations' directory created...".success);
			}
		},
		handleError
	);
}

function up(api) {
	var provider = new MigrationProvider(path.join(miteRoot, "migrations"));

	return api.up(provider.getMigrations()).then(function (upStatus) {
		if (!upStatus.updated && upStatus.wasClean) {
			console.log("no migrations executed. status is clean.".warn);
		} else if (!upStatus.updated && upStatus.dirtyMigrations) {
			printMigrationList("no migrations executed. there are dirty migrations. fix it.".error, upStatus.dirtyMigrations, "error");
		} else if (upStatus.updated) {
			console.log("migrations executed".success);
		}
	}, handleError);
}

function stepUp (api) {
	var provider = new MigrationProvider(path.join(miteRoot, "migrations"));

	return api.stepUp(provider.getMigrations()).then(function(stepStatus) {
		if(stepStatus.updated) {
			console.log("migration executed".success);
		} else if(!stepStatus.updated && stepStatus.wasClean) {
			console.log("no migration executed. status was clean".warn);
		} else if(stepStatus.dirtyMigrations) {
			printMigrationList("no migration executed. status is dirty. fix it.".error, stepStatus.dirtyMigrations, "error");
		}
	}, handleError);
}

function stepDown (api) {
	var provider = new MigrationProvider(path.join(miteRoot, "migrations"));

	return api.stepDown(provider.getMigrations()).then(function(downStat) {
		if(downStat.updated) {
			console.log("down migration executed".success);
		} else if(downStat.noExecutedMigrations) {
			console.log("no down migration executed. there are no executed migrations to step down from".warn);
		} else if(!downStat.updated && downStat.missingDown) {
			console.log("%s' does not have a down to execute".error, downStat.migrationKey);
		} else {
			console.log("something bad happened....".error);
		}
	});
}