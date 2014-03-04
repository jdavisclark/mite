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
	readline = require("readline"),
	format = require("util").format,
	cliUtil = require("./util"),
	handleError = cliUtil.handleError,
	connectionError = cliUtil.connectionError,
	handleUninitialized = cliUtil.handleUninitialized,
	forceExit = cliUtil.forceExit;

var UpCommand = require("./up"),
	StatusCommand = require("./status"),
	CreateCommand = require("./create"),
	StepUpCommand = require("./stepUp"),
	StepDownCommand = require("./stepDown"),
	InitCommand = require("./init"),
	DownCommand = require("./down"),
	AuditCommand = require("./audit");

var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

var miteRoot = getMiteRoot(process.cwd());

//TODO: allow mite init without a mite root
if (!miteRoot) {
	reporter.err("fatal: not a mite project (or any of the parent directories): mite.config");
	process.exit(1);
}

var config = getMiteConfig(miteRoot);
var mite = new Mite(config);

program
	.version(mitePackage.version);

program
	.command("status")
	.description("show migration status")
	.action(function() {
		runCommand(new StatusCommand());
	});

program
	.command("init")
	.description("init the _migration table and migrations directory")
	.action(function() {
		runCommand(new InitCommand());
	});

program
	.command("up")
	.description("run all unexecuted migrations")
	.action(function() {
		runCommand(new UpCommand());
	});

/*
	TODO: I would rather the syntax be "mite step up", "mite step down", "mite step to 2014-02-18T05:29:39.686Z", etc...
	investigate the best way to configure sub commands.
*/
program
	.command("stepup")
	.description("run the first unexecuted migration")
	.action(function() {
		runCommand(new StepUpCommand());
	});

var downCli = program
	.command("down")
	.description("run all the down migrations")
	.option("-C --confirm", "comfirm potentially dangerous operation")
	.action(function() {
		var p = downCli.confirm ? q() : confirmDestructiveCommand("down");

		p.then(function() {
			return runCommand(new DownCommand());
		}, function() {
			reporter.err("aborted");
			process.exit(1);
		});
	});

var stepDownCli = program
	.command("stepdown")
	.option("-C --confirm", "comfirm potentially dangerous operation")
	.description("step down one migration from the current head")
	.action(function() {
		var p = stepDownCli.confirm ? q() : confirmDestructiveCommand("stepdown");
		p.then(function() {
			runCommand(new StepDownCommand());
		}, function() {
			reporter.err("aborted");
			process.exit(1);
		});
	});


program
	.command("create")
	.description("create a new (empty) migration file")
	.action(function() {
		runCommand(new CreateCommand());
	});

program
	.command("help [command]")
	.description("display general usage information, or usage info for a specific command")
	.action(function(arg, ignore) {
		if(arg === "down") {
			downCli.help();
		} else if(arg === "stepdown") {
			stepDownCli.help();
		} else {
			program.help();
		}
	});


program
	.command("audit")
	.description("determine what's wrong with your schema")
	.action(function() {
		runCommand(new AuditCommand());
	});


program
	.command("*")
	.action(function(arg) {
		reporter.err("invalid command: '%s'", arg);
		program.help();
	});

program.parse(process.argv);

function confirmDestructiveCommand(cmd) {
	var def = q.defer();
	rl.question(format("%s is potentially destructive. Continue? (y/N): ", cmd || "this" ), function(resp) {
		if(resp.toLowerCase() === "y") {
			def.resolve();
		} else {
			def.reject();
		}
	});

	return def.promise;
}

function getMiteRoot(dir) {
	dir = dir || process.cwd();
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

function getMiteConfig(root) {
	var userConfigRaw = fs.readFileSync(path.join(root, "mite.config"), "utf8");
	var userConfig;

	try {
		userConfig = JSON.parse(userConfigRaw);
	} catch(e) {
		reporter.err("fatal: invalid json in mite.config (%s)", path);
		reporter.err(e);
		return;
	}

	var cfg = _.extend({}, defaults, userConfig);
	cfg.migrationRoot = path.join(root, cfg.migrationFolderName);
	cfg.miteRoot = root;

	return cfg;
}

function runCommand(command) {
	return q.fapply(getMiteRoot).then(function(root) {
		return q.fapply(getMiteConfig, [root]).then(function(cfg) {
			return q.when(command.preExecute(cfg)).then(function(m) {
				return q.when(command.execute(m));
			});
		});
	})
	.fail(handleError)
	.fin(forceExit);
}