#!/usr/bin/env node

var Mite = require("./mite"),
	program = require('commander'),
	moment = require('moment'),
	path = require('path'),
	colors = require("colors"),
	fs = require('fs'),
	sha1 = require('sha1'),
	mitePackage = require(path.join(__dirname, "../", "package.json")),
	MigrationHasher = require("./migrationHasher");

var miteRoot = getMiteRoot(process.cwd()),
	mite = null;

if (!miteRoot) {
	console.error("fatal: not a mite project (or any of the parent directories): mite.config");
	process.exit(1);
}

var config = JSON.parse(fs.readFileSync(path.join(miteRoot, "mite.config"), "utf8"));
mite = new Mite(config);

colors.setTheme({
	success: "green",
	warn: "yellow",
	error: "red",
	info: "underline"
});


program
	.version(mitePackage.version);

program
	.command("create")
	.description("create a new migratrion")
	.action(function () {
		create(mite);
	});

program
	.command("status")
	.description("show migratrion status")
	.action(function () {
		status(mite);
	});

program
	.command("init")
	.description("init the _migration table and migrations directory")
	.action(function () {
		init(mite);
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

function handleError(err) {
	if (err) {
		console.log(err.error);
		process.exit(1);
	}
}

function create(api) {
	console.info("[ mite: create ]");
}

function status(api) {
	var hasher = new MigrationHasher(path.join(miteRoot, "migrations"));

	api.status(hasher.getMigrations()).then(function (miteStatus) {
		if (miteStatus.clean) {
			console.log("clean".success);
		} else if (miteStatus.dirtyMigrations) {
			console.log("dirty migrations:".info);
			miteStatus.dirtyMigrations.forEach(function (dm) {
				console.log(("\t" + dm).error);
			});
			console.log("");
		} else if (miteStatus.unexecutedMigrations) {
			console.log("unexecuted migrations:".info);
			miteStatus.unexecutedMigrations.forEach(function (uem) {
				console.log(("\t" + uem).warn);
			});
		}
	}, handleError);
}


function init(api) {
	api.init().then(
		function (created) {
			if (!created) {
				console.log("_migration table already created...skipping".warn);
			} else {
				console.log("_migration table created...".success);
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
				console.info("'migrations' directory created...".success)
			}
		},
		function (err) {
			console.log(err.error);
		}
	);
}