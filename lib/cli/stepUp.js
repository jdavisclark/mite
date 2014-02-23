var path = require("path"),
	reporter = require("./reporter"),
	printMigrationList = require("./util").printMigrationList,
	MigrationProvider = require("../MigrationProvider");

module.exports = StepUpCommand;

function StepUpCommand() {}

StepUpCommand.prototype.execute = function(mite, miteRoot) {
	var provider = new MigrationProvider(path.join(miteRoot, "migrations"));

	return mite.stepUp(provider.getMigrations()).then(function(stepStatus) {
		if (stepStatus.updated) {
			reporter.success("migration executed");
		} else if (!stepStatus.updated && stepStatus.wasClean) {
			reporter.warn("no migration executed. status was clean");
		} else if (stepStatus.dirtyMigrations) {
			printMigrationList("no migration executed. status is dirty. fix it.", "err", stepStatus.dirtyMigrations, "err");
		}
	});
};