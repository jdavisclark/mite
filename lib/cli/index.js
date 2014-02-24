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

var UpCommand = require("./up"),
	StatusCommand = require("./status"),
	CreateCommand = require("./create"),
	StepUpCommand = require("./stepUp"),
	StepDownCommand = require("./stepDown"),
	InitCommand = require("./init"),
	DownCommand = require("./down");

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
				var status = new StatusCommand();
				status.execute(mite, miteRoot).then(forceExit, handleError);
			}, handleUninitialized);
		}, connectionError);
	});

program
	.command("init")
	.description("init the _migration table and migrations directory")
	.action(function() {
		mite.connect().then(function() {
			var init = new InitCommand();
			init.execute(mite, miteRoot).then(forceExit, handleError);
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
				var stepUp = new StepUpCommand();
				stepUp.execute(mite, miteRoot).then(forceExit, handleError);
			}, handleUninitialized);
		}, connectionError);
	});

program
	.command("down")
	.description("run all the down migrations")
	.action(function() {
		mite.connect().then(function() {
			mite._requireInit().then(function() {
				var down = new DownCommand();
				down.execute(mite, miteRoot).then(forceExit, handleError);
			}, handleUninitialized);
		}, connectionError);
	});

program
	.command("stepdown")
	.description("step down one migration from the current head")
	.action(function() {
		mite.connect().then(function() {
			mite._requireInit().then(function() {
				var stepDown = new StepDownCommand();
				stepDown.execute(mite, miteRoot).then(forceExit, handleError);
			}, handleUninitialized);
		}, connectionError);
	});


program
	.command("create")
	.description("create a new (empty) migration file")
	.action(function() {
		var create = new CreateCommand();
		create.execute(mite, miteRoot).then(forceExit, handleError);
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