#!/usr/bin/env node

require("../requireExtensions");

var Mite = require("../mite"),
	program = require("commander"),
	path = require("path"),
	colors = require("colors"),
	exec = require("child_process").exec,
	fs = require("fs"),
	q = require("q"),
	_ = require("underscore"),
	mitePackage = require(path.join(__dirname, "../", "../", "package.json")),
	defaults = require(path.join(__dirname, "../", "../", "defaults.json")),
	MigrationProvider = require("../migrationProvider"),
	Auditor = require("./audit");

colors.setTheme({
	success: "green",
	warn: "yellow",
	err: "red",
	errEmphasis: ["red", "underline"],
	info: "underline"
});

var miteRoot = getMiteRoot(process.cwd());

//TODO: allow mite init without a mite root
if (!miteRoot) {
	console.log("fatal: not a mite project (or any of the parent directories): mite.config".err);
	process.exit(1);
}

var config = _.extend({}, defaults, JSON.parse(fs.readFileSync(path.join(miteRoot, "mite.config"), "utf8")));
var mite = new Mite(config);

program
	.version(mitePackage.version);

program
	.command("status")
	.description("show migratrion status")
	.action(function() {
		mite.connect().then(function() {
			mite._requireInit().then(function() {
				status(mite).then(forceExit, handleError);
			}, handleUninitialized);
		}, connectionError);
	});

program
	.command("init")
	.description("init the _migration table and migrations directory")
	.action(function() {
		mite.connect().then(function() {
			init(mite).then(forceExit, handleError);
		}, connectionError);
	});

program
	.command("up")
	.description("run all unexecuted migrations")
	.action(function() {
		mite.connect().then(function() {
			mite._requireInit().then(function() {
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
	.action(function() {
		var provider = new MigrationProvider(path.join(miteRoot, "migrations")),
			auditor = new Auditor(config, provider, miteRoot);

		auditor.audit().then(forceExit);
	});


program
	.command("*")
	.action(function(arg) {
		console.log("invalid command: '%s'".err, arg);
		program.help();
	});

program.parse(process.argv);

function getMiteRoot(dir) {
	var prev = null;

	while (prev !== "/" && dir !== "/") {
		var files = fs.readdirSync(dir);

		if (files.some(function(x) {
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
		console.log(("FATAL:" + err).err);
		process.exit(1);
	}
}

function connectionError(err) {
	if (err) {
		console.log(("Mite Connection Error: " + err).err);
		process.exit(1);
	}
}

function handleUninitialized() {
	console.log("fatal: not in an initialized mite project".err);
	process.exit(1);
}

function create() {
	var migrationRoot = path.join(miteRoot, "migrations");
	var isoString = (new Date()).toISOString();
	var filename = (isoString.substring(0, isoString.lastIndexOf(".")) + "Z").replace(/\:/g, "-") + ".sql";

	try {
		fs.writeFileSync(path.join(migrationRoot, filename), require("../templates/migration.sql"));
		console.log(("migration created: " + filename).success);
	} catch (e) {
		console.log((e.toString()).err);
	}
	return q.resolve();
}

function status(api) {
	var provider = new MigrationProvider(path.join(miteRoot, "migrations"));

	return api.status(provider.getMigrations()).then(function(miteStatus) {
		if (miteStatus.clean) {
			console.log("clean".success);
		} else {
			if (miteStatus.dirtyMigrations) {
				printMigrationList("dirty migrations:".info, miteStatus.dirtyMigrations, "err");
			}

			if (miteStatus.unexecutedMigrations) {
				printMigrationList("unexecuted migrations:".info, miteStatus.unexecutedMigrations, "warn");
			}
		}
	}, handleError);
}

function printMigrationList(header, migrations, migrationLevel) {
	console.log(header);
	migrations.forEach(function(m) {
		console.log(("\t" + m)[migrationLevel]);
	});
}


function init(api) {
	return api.init().then(
		function(initStatus) {
			if (initStatus.alreadyInitialized) {
				console.log("_migration table already exists...skipping".warn);
			} else if (initStatus.initialized) {
				console.log("_migration table created...".success);
			} else {
				console.log("fatal: could not create the _migration table".err);
			}

			// create migrations directory
			var migrationsPath = path.join(miteRoot, "migrations");

			if (fs.existsSync(migrationsPath)) {
				var stats = fs.lstatSync(migrationsPath);

				if (!stats.isDirectory()) {
					console.err(("fatal: 'migrations' exists at the mite root, but it is not a directory (" + migrationsPath + ").").err);
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

	return api.up(provider.getMigrations()).then(function(upStatus) {
		if (!upStatus.updated && upStatus.wasClean) {
			console.log("no migrations executed. status is clean.".warn);
		} else if (!upStatus.updated && upStatus.dirtyMigrations) {
			printMigrationList("no migrations executed. there are dirty migrations. fix it.".err, upStatus.dirtyMigrations, "err");
		} else if (upStatus.updated) {
			console.log("migrations executed".success);
		}
	}, handleError);
}

function stepUp(api) {
	var provider = new MigrationProvider(path.join(miteRoot, "migrations"));

	return api.stepUp(provider.getMigrations()).then(function(stepStatus) {
		if (stepStatus.updated) {
			console.log("migration executed".success);
		} else if (!stepStatus.updated && stepStatus.wasClean) {
			console.log("no migration executed. status was clean".warn);
		} else if (stepStatus.dirtyMigrations) {
			printMigrationList("no migration executed. status is dirty. fix it.".err, stepStatus.dirtyMigrations, "err");
		}
	}, handleError);
}

function stepDown(api) {
	var provider = new MigrationProvider(path.join(miteRoot, "migrations"));

	return api.stepDown(provider.getMigrations()).then(function(downStat) {
		if (downStat.updated) {
			console.log("down migration executed".success);
		} else if (downStat.noExecutedMigrations) {
			console.log("no down migration executed. there are no executed migrations to step down from".warn);
		} else if (!downStat.updated && downStat.missingDown) {
			printMigrationList("error. migrations in the down path are missing a down...".errEmphasis, downStat.migrationsInPathWithoutDown, "err")
		} else {
			console.log("something bad happened....".err);
		}
	});
}