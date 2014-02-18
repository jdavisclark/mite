#!/usr/bin/env node

var Mite = require("./mite"),
	program = require("commander"),
	path = require("path"),
	colors = require("colors"),
	fs = require("fs"),
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

if (!miteRoot) {
	console.log("fatal: not a mite project (or any of the parent directories): mite.config".error);
	process.exit(1);
}

var config = JSON.parse(fs.readFileSync(path.join(miteRoot, "mite.config"), "utf8"));
mite = new Mite(config)


program
	.version(mitePackage.version);

program
	.command("status")
	.description("show migratrion status")
	.action(function () {
		mite.connect().then(function () {
			mite._requireInit().then(function () {
				status(mite).then(forceExit);
			}, handleUninitialized);
		}, connectionError);
	});

program
	.command("init")
	.description("init the _migration table and migrations directory")
	.action(function () {
		mite.connect().then(function () {
			init(mite).then(forceExit);
		}, connectionError);
	});

program
	.command("up")
	.description("run all unexecuted migrations")
	.action(function () {
		mite.connect().then(function () {
			mite._requireInit().then(function () {
				up(mite).then(forceExit);
			}, handleUninitialized);
		}, connectionError);
	});

program
	.command("stepup")
	.description("run the first unexecuted migration")
	.action(function() {
		mite.connect().then(function() {
			mite._requireInit().then(function() {
				stepUp(mite).then(forceExit);
			}, handleUninitialized);
		}, connectionError);
	});

program
	.command("help")
	.description("display usage information")
	.action(function() {
		program.help();
	});

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
		console.log(err.error);
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

function create(api) {
	console.info("[ mite: create ]");
}

function status(api) {
	var provider = new MigrationProvider(path.join(miteRoot, "migrations"));

	return api.status(provider.getMigrations()).then(function (miteStatus) {
		if (miteStatus.clean) {
			console.log("clean".success);
		} else if (miteStatus.dirtyMigrations) {
			printMigrationList("dirty migrations:".info, miteStatus.dirtyMigrations, "error");
			console.log("");
		} else if (miteStatus.unexecutedMigrations) {
			printMigrationList("unexecuted migrations:".info, miteStatus.unexecutedMigrations, "warn");
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
			printMigrationList("error. there are dirty migrations:".error, upStatus.dirtyMigrations, "error");
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
			printMigrationList("no migration executed. status is dirty.".error, stepStatus.dirtyMigrations, "error");
		}
	}, handleError);
}