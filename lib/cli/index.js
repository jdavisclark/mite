#!/usr/bin/env node

require("../requireExtensions");

var Mite = require("../mite"),
	program = require("commander"),
	path = require("path"),
	reporter = require("./reporter"),
	fs = require("fs"),
	q = require("q"),
	_ = require("underscore"),
	mitePackage = require(path.join(__dirname, "../", "../", "package.json")),
	defaults = require(path.join(__dirname, "../", "../", "defaults.json")),
	MigrationProvider = require("../migrationProvider"),
	Auditor = require("./audit"),
	printMigrationList = require("./util").printMigrationList;

var UpCommand = require("./up");

var miteRoot = getMiteRoot(process.cwd());

//TODO: allow mite init without a mite root
if (!miteRoot) {
	reporter.err("fatal: not a mite project (or any of the parent directories): mite.config");
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
				var up = new UpCommand();
				up.execute(mite, miteRoot).then(forceExit, handleError);
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
		reporter.err("invalid command: '%s'", arg);
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
		reporter.err("FATAL:" + err);
		process.exit(1);
	}
}

function connectionError(err) {
	if (err) {
		reporter.err("Mite Connection Error: " + err);
		process.exit(1);
	}
}

function handleUninitialized() {
	reporter.err("fatal: not in an initialized mite project");
	process.exit(1);
}

function create() {
	var migrationRoot = path.join(miteRoot, "migrations");
	var isoString = (new Date()).toISOString();
	var filename = (isoString.substring(0, isoString.lastIndexOf(".")) + "Z").replace(/\:/g, "-") + ".sql";

	try {
		fs.writeFileSync(path.join(migrationRoot, filename), require("../../templates/migration.sql"));
		reporter.success("migration created: " + filename);
	} catch (e) {
		reporter.err(e.toString());
	}
	return q.resolve();
}

function status(api) {
	var provider = new MigrationProvider(path.join(miteRoot, "migrations"));

	return api.status(provider.getMigrations()).then(function(miteStatus) {
		if (miteStatus.clean) {
			reporter.success("clean");
		} else {
			if (miteStatus.dirtyMigrations) {
				printMigrationList("dirty migrations:", "info", miteStatus.dirtyMigrations, "err");
			}

			if (miteStatus.unexecutedMigrations) {
				printMigrationList("unexecuted migrations:", "info", miteStatus.unexecutedMigrations, "warn");
			}
		}
	}, handleError);
}


function init(api) {
	return api.init().then(
		function(initStatus) {
			if (initStatus.alreadyInitialized) {
				reporter.warn("_migration table already exists...skipping");
			} else if (initStatus.initialized) {
				reporter.success("_migration table created...");
			} else {
				reporter.err("fatal: could not create the _migration table");
			}

			// create migrations directory
			var migrationsPath = path.join(miteRoot, "migrations");

			if (fs.existsSync(migrationsPath)) {
				var stats = fs.lstatSync(migrationsPath);

				if (!stats.isDirectory()) {
					reporter.err("fatal: 'migrations' exists at the mite root, but it is not a directory (" + migrationsPath + ").");
					process.exit(1);
				}

				reporter.warn("'migrations' directory exists...skipping");
			} else {
				fs.mkdirSync(migrationsPath);
				reporter.success("'migrations' directory created...");
			}
		},
		handleError
	);
}

function stepUp(api) {
	var provider = new MigrationProvider(path.join(miteRoot, "migrations"));

	return api.stepUp(provider.getMigrations()).then(function(stepStatus) {
		if (stepStatus.updated) {
			reporter.success("migration executed");
		} else if (!stepStatus.updated && stepStatus.wasClean) {
			reporter.warn("no migration executed. status was clean");
		} else if (stepStatus.dirtyMigrations) {
			printMigrationList("no migration executed. status is dirty. fix it.", "err", stepStatus.dirtyMigrations, "err");
		}
	}, handleError);
}

function stepDown(api) {
	var provider = new MigrationProvider(path.join(miteRoot, "migrations"));

	return api.stepDown(provider.getMigrations()).then(function(downStat) {
		if (downStat.updated) {
			reporter.success("down migration executed");
		} else if (downStat.noExecutedMigrations) {
			reporter.warn("no down migration executed. there are no executed migrations to step down from");
		} else if (!downStat.updated && downStat.missingDown) {
			printMigrationList("error. migrations in the down path are missing a down...", "errEmphasis", downStat.migrationsInPathWithoutDown, "err");
		} else {
			reporter.err("something bad happened....");
		}
	});
}