var Mite = require("../mite"),
	reporter = require("./reporter"),
	MigrationProvider = require("../migrationProvider");

var cliUtil = require("./util"),
	printMigrationList = cliUtil.printMigrationList,
	connectionError = cliUtil.connectionError;

module.exports = StepUpCommand;

function StepUpCommand() {}

StepUpCommand.prototype.preExecute = function(config) {
	var mite = new Mite(config);

	return mite.connect()
			.fail(connectionError)
			.then(mite._requireInit.bind(mite))
			.then(function(){
				return mite;
			});
};

StepUpCommand.prototype.execute = function(mite) {
	var provider = new MigrationProvider(mite.config.migrationRoot);

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