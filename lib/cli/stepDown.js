var Mite = require("../mite"),
	reporter = require("./reporter"),
	MigrationProvider = require("../migrationProvider"),
	readline = require("readline"),
	_ = require("underscore");

var cliUtil = require("./util"),
	printMigrationList = cliUtil.printMigrationList,
	connectionError = cliUtil.connectionError,
	confirmDestructiveCommand = cliUtil.confirmDestructiveCommand,
	handleUninitialized = cliUtil.handleUninitialized;

module.exports = StepDownCommand;

function StepDownCommand(opts){
	this.options = _.extend({
		confirmed: false
	}, opts);

	this.rl = readline.createInterface({
		input: opts.rlInput || process.stdin,
		output: opts.rlOutput || process.stdout
	});
}

StepDownCommand.prototype.preExecute = function(config) {
	var mite = new Mite(config),
		self = this;

	return mite.connect()
			.fail(connectionError)
			.then(mite._requireInit.bind(mite))
			.fail(handleUninitialized)
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

StepDownCommand.prototype.execute = function(mite) {
	var opts = {
			submodule: mite.config.name
		},
		provider = new MigrationProvider(mite.config.migrationRoot, opts),
		eventReporter = function(key) {
			reporter.success("down: %s...", key);
		};

	mite.on("migrationExecuted", eventReporter);

	return mite.stepDown(provider.getMigrations(), opts).then(function(downStat) {
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