var Mite = require("../mite"),
	reporter = require("./reporter"),
	MigrationProvider = require("../migrationProvider");

var cliUtil = require("./util"),
	printMigrationList = cliUtil.printMigrationList,
	connectionError = cliUtil.connectionError;

module.exports = StepDownCommand;

function StepDownCommand(){}

StepDownCommand.prototype.preExecute = function(config) {
	var mite = new Mite(config);

	return mite.connect()
			.fail(connectionError)
			.then(mite._requireInit.bind(mite))
			.then(function() {
				return mite;
			});
};

StepDownCommand.prototype.execute = function(mite) {
	var provider = new MigrationProvider(mite.config.migrationRoot);

	var eventReporter = function(key) {
		reporter.success("down: %s...", key);
	};

	mite.on("migrationExecuted", eventReporter);

	return mite.stepDown(provider.getMigrations()).then(function(downStat) {
		if (downStat.updated) {
			reporter.success("complete");
		} else if (downStat.noExecutedMigrations) {
			reporter.warn("no down migration executed. there are no executed migrations to step down from");
		} else if (!downStat.updated && downStat.missingDown) {
			printMigrationList("error. migrations in the down path are missing a down...", "errEmphasis", downStat.migrationsInPathWithoutDown, "err");
		} else {
			reporter.err("something bad happened....");
		}

		mite.removeListener("migrationExecuted", eventReporter);
	});
};