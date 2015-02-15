var Mite = require("../mite"),
	MigrationProvider = require("../migrationProvider"),
	submoduleProviderFactory = require("../submoduleProviderFactory"),
	reporter = require("./reporter"),
	printMigrationList = require("./util").printMigrationList,
	q = require("q"),
	_ = require("underscore");

var miteUtil = require("./util"),
	printMigrationList = miteUtil.printMigrationList,
	connectionError = miteUtil.connectionError,
	handleUninitialized = miteUtil.handleUninitialized;

module.exports = StatusCommand;

function StatusCommand(opts) {
	this.options = _.extend({
		all: false
	}, opts);
}

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
		self._printStatus(miteStatus);

		if (mite.config.reportSubmoduleSummaryStatus || self.options.all) {
			var subProvider = submoduleProviderFactory(mite.config.submodules);

			subProvider.on("error", function(e, errPath) {
				var localPath = errPath.replace(mite.config.miteRoot, "");
				if (localPath[0] === "/") {
					localPath = localPath.slice(1);
				}

				reporter.err("Submodule Context Error: %s : %s", e.code, localPath);
			});


			var submodules = subProvider.getSubmodules(mite.config);

			if (submodules.length > 0) {
				var pSubStatuses = submodules.map(function(s) {
					var clone = JSON.parse(JSON.stringify(mite.config));
					var config = miteUtil.applySubmoduleToConfig(clone, s);
					var m = new Mite(config);

					return self._status(m).then(function(status) {
						return {
							status: status,
							name: s.name
						};
					});
				});

				return q.all(pSubStatuses).then(function(statuses) {
					reporter.write("submodules: ");

					var dirty = statuses.some(function(s) {
						return !!s.status.dirtyMigrations;
					});

					var unexec = statuses.some(function(s) {
						return !!s.status.unexecutedMigrations;
					});

					// these are the only two possible cases
					if (self.options.all) {
						reporter.write("\n");

						statuses.forEach(function(subStat) {
							reporter.info("%s:", subStat.name);
							reporter.indent();
							self._printStatus(subStat.status);
							reporter.outdent();
						});
					} else {
						if (!dirty && !unexec) {
							reporter.success("clean");
						} else {
							if (unexec) {
								reporter.writeWarn("unexecuted");
							}

							if (unexec && dirty) {
								reporter.write(" & ");
							}

							if (dirty) {
								reporter.writeErr("dirty");
							}
							reporter.log("");
						}
					}
				});
			}
		}
	});
};

StatusCommand.prototype._status = function(mite) {
	var opts = {
		submodule: mite.config.name
	};

	var provider = new MigrationProvider(mite.config.migrationRoot, opts);

	return mite.status(provider.getMigrations(), opts).then(function(miteStatus) {
		return miteStatus;
	});
};

StatusCommand.prototype._printStatus = function(status) {
	if (status.clean) {
		reporter.success("clean");
		return;
	}

	// not clean

	if (status.dirtyMigrations) {
		var messages = status.dirtyMigrations.map(function(dirtyMigration) {
			return dirtyMigration.key + ":: expected [" + dirtyMigration.hash + "]";
		});

		printMigrationList("dirty migrations:", "info", messages, "err");
	}

	if (status.unexecutedMigrations) {
		printMigrationList("unexecuted migrations:", "info", status.unexecutedMigrations, "warn");
	}
};