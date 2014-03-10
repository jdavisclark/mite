var Mite = require("../mite"),
	MigrationProvider = require("../migrationProvider"),
	submoduleProviderFactory = require("../submoduleProviderFactory"),
	reporter = require("./reporter"),
	printMigrationList = require("./util").printMigrationList,
	q = require("q");

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
	var self = this;

	return self._status(mite).then(function(miteStatus) {
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

		if(mite.config.reportSubmoduleSummaryStatus) {
			var subProvider = submoduleProviderFactory(mite.config.submodules);
			var submodules = subProvider.getSubmodules(mite.config);

			if(submodules.length > 0) {
				var pSubStatuses = submodules.map(function(s) {
					var config = miteUtil.applySubmoduleToConfig(mite.config, s);
					var m = new Mite(config);
					return self._status(m);
				});

				return q.all(pSubStatuses).then(function(statuses) {
					var dirty = statuses.some(function(s) {
							return !!s.dirtyMigrations;
						}),
						unexec = statuses.some(function(s) {
							return !!s.unexecutedMigrations;
						});

					reporter.write("submodules: ");

					if(!dirty && !unexec) {
						reporter.success("clean");
					} else {
						if(unexec) {
							reporter.writeWarn("unexecuted");
						}

						if(unexec && dirty) {
							reporter.write(" & ");
						}

						if(dirty) {
							reporter.writeErr("dirty");
						}
						reporter.log("");
					}
				});
			}
		}
	});
};

StatusCommand.prototype._status = function(mite) {
	var opts = {
			submodule: mite.config.name
		},
		provider = new MigrationProvider(mite.config.migrationRoot, opts);


	return mite.status(provider.getMigrations(), opts).then(function(miteStatus) {
		return miteStatus;
	});
};