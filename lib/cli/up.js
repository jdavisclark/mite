var Mite = require("../mite"),
	MigrationProvider = require("../migrationProvider"),
	reporter = require("./reporter");

var cliUtil = require("./util"),
	connectionError = cliUtil.connectionError,
	printMigrationList = cliUtil.printMigrationList,
	handleUninitialized = cliUtil.handleUninitialized;

module.exports = UpCommand;

function UpCommand() {}

UpCommand.prototype.preExecute = function(config) {
	var mite = new Mite(config);

	return mite.connect()
			.fail(connectionError)
			.then(mite._requireInit.bind(mite))
			.fail(handleUninitialized)
			.then(function() {
				return mite;
			});
};

UpCommand.prototype.execute = function(mite) {
	var provider = new MigrationProvider(mite.config.migrationRoot);
	var notifier = function(migrationKey) {
		reporter.success("up: %s...", migrationKey);
	};

	mite.on("migrationExecuted", notifier);

	var p = mite.up(provider.getMigrations()).then(function(upStatus) {
		if (!upStatus.updated && upStatus.wasClean) {
			reporter.warn("no migrations executed. status is clean.");
		} else if (!upStatus.updated && upStatus.dirtyMigrations) {
			printMigrationList("no migrations executed. there are dirty migrations. fix it.", "err", upStatus.dirtyMigrations, "err");
		} else if (upStatus.updated) {
			reporter.success("complete");
		}
	});

	p.finally(function() {
		mite.removeListener("migrationExecuted", notifier);
	});

	return p;
};