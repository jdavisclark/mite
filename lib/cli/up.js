var MigrationProvider = require("../migrationProvider"),
	printMigrationList = require("./util").printMigrationList,
	reporter = require("./reporter");

module.exports = UpCommand;

function UpCommand() {}

UpCommand.prototype.execute = function(mite, config) {
	var provider = new MigrationProvider(config.migrationRoot);
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