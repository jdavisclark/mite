var Mite = require("../mite"),
	MigrationProvider = require("../migrationProvider"),
	reporter = require("./reporter"),
	printMigrationList = require("./util").printMigrationList;

var miteUtil = require("./util"),
	printMigrationList = miteUtil.printMigrationList,
	connectionError = miteUtil.connectionError,
	handleUninitialized = miteUtil.handleUninitialized;

module.exports = StatusCommand;

function StatusCommand() {}

StatusCommand.prototype.preExecute = function(config) {
	var mite = new Mite(config);

	return mite.connect()
			.fail(connectionError)
			.then(mite._requireInit.bind(mite))
			.fail(handleUninitialized)
			.then(function() {
				return mite;
			});

};

StatusCommand.prototype.execute = function(mite) {
	var provider = new MigrationProvider(mite.config.migrationRoot);

	return mite.status(provider.getMigrations()).then(function(miteStatus) {
		if (miteStatus.clean) {
			reporter.success("clean");
		} else {
			if (miteStatus.dirtyMigrations) {
				printMigrationList("dirty migrations:", "info", miteStatus.dirtyMigrations, "err");
			}

			if (miteStatus.unexecutedMigrations) {
				printMigrationList("unexecuted migrations:", "info", miteStatus.unexecutedMigrations, "warn");
			}
		}
	});
};