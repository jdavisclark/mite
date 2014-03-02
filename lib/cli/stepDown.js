var path = require("path"),
	reporter = require("./reporter"),
	MigrationProvider = require("../migrationProvider"),
	printMigrationList = require("./util").printMigrationList;

module.exports = StepDownCommand;

function StepDownCommand(){}

StepDownCommand.prototype.execute = function(mite, config) {
	var provider = new MigrationProvider(config.migrationRoot);

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