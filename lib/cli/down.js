var Mite = require("../mite"),
	reporter = require("./reporter"),
	MigrationProvider = require("../migrationProvider"),
	readline = require("readline"),
	_ = require("underscore"),
	q = require("q");

var cliUtil = require("./util"),
	printMigrationList = cliUtil.printMigrationList,
	connectionError = cliUtil.connectionError,
	confirmDestructiveCommand = cliUtil.confirmDestructiveCommand;

module.exports = DownCommand;

function DownCommand(opts) {
	this.options = _.extend({
		confirmed: false
	}, opts);

	this.rl = readline.createInterface({
		input: opts.rlInput || process.stdin,
		output: opts.rlOutput || process.stdout
	});
}

DownCommand.prototype.preExecute = function(config) {
	var mite = new Mite(config),
		self = this;

	return mite.connect()
			.fail(connectionError)
			.then(mite._requireInit.bind(mite))
			.then(function() {
				if(self.options.confirmed) {
					return mite;
				} else {
					return confirmDestructiveCommand(self.rl, "down").then(function() {
						return mite;
					});
				}
			});
};

DownCommand.prototype.execute = function(mite) {
	var provider = new MigrationProvider(mite.config.migrationRoot),
		progressReporter = function(key) {
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