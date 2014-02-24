var path = require("path"),
	reporter = require("./reporter"),
	MigrationProvider = require("../migrationProvider"),
	printMigrationList = require("./util").printMigrationList;

module.exports = DownCommand;

function DownCommand() {}

DownCommand.prototype.execute = function(mite, miteRoot) {
	var provider = new MigrationProvider(path.join(miteRoot, "migrations"));

	var progressReporter = function(key) {
		reporter.success("down: %s...", key);
	};

	mite.on("migrationExecuted", progressReporter);

	return mite.down(provider.getMigrations()).then(function(downStat) {
		if (downStat.updated) {
			reporter.success("complete");
		} else if (downStat.noExecutedMigrations) {
			reporter.warn("no down migrations executed. there are no executed migrations to step down from");
		} else if (!downStat.updated && downStat.missingDown) {
			printMigrationList("error. migrations in the down path are missing a down...", "errEmphasis", downStat.migrationsInPathWithoutDown, "err");
		} else {
			reporter.err("something bad happened....");
		}

		mite.removeListener("migrationExecuted", progressReporter);
	});
};