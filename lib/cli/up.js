var MigrationProvider = require("../migrationProvider"),
	path = require("path"),
	q = require("q"),
	printMigrationList = require("./util").printMigrationList,
	reporter = require("./reporter");

module.exports = UpCommand;

function UpCommand() {}

UpCommand.prototype.execute = function(mite, miteRoot) {
	var provider = new MigrationProvider(path.join(miteRoot, "migrations"));
	var notifier = function(migrationKey) {
		reporter.success(migrationKey + "...");
	};

	mite.on("migrationExecuted", notifier);

	var p = mite.up(provider.getMigrations()).then(function(upStatus) {
		if (!upStatus.updated && upStatus.wasClean) {
			reporter.warn("no migrations executed. status is clean.");
		} else if (!upStatus.updated && upStatus.dirtyMigrations) {
			printMigrationList("no migrations executed. there are dirty migrations. fix it.", "err", upStatus.dirtyMigrations, "err");
		} else if (upStatus.updated) {
			reporter.success("migrations executed");
		}
	});

	p.finally(function() {
		mite.removeListener("migrationExecuted", notifier);
	});

	return p;
};