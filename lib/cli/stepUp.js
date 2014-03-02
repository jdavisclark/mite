var path = require("path"),
	reporter = require("./reporter"),
	printMigrationList = require("./util").printMigrationList,
	MigrationProvider = require("../MigrationProvider");

module.exports = StepUpCommand;

function StepUpCommand() {}

StepUpCommand.prototype.execute = function(mite, config) {
	var provider = new MigrationProvider(config.migrationRoot);

	var executed = function(key) {
		reporter.success("up: %s...", key);
	};

	mite.on("migrationExecuted", executed);

	return mite.stepUp(provider.getMigrations()).then(function(stepStatus) {
		if (stepStatus.updated) {
			reporter.success("complete");
		} else if (!stepStatus.updated && stepStatus.wasClean) {
			reporter.warn("no migration executed. status was clean");
		} else if (stepStatus.dirtyMigrations) {
			printMigrationList("no migration executed. status is dirty. fix it.", "err", stepStatus.dirtyMigrations, "err");
		}

		mite.removeListener("migrationExecuted", executed);
	});
};