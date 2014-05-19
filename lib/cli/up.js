var Mite = require("../mite"),
	MigrationProvider = require("../migrationProvider"),
	reporter = require("./reporter"),
	submoduleProviderFactory = require("../submoduleProviderFactory"),
	SubmoduleTree = require("../submoduleTree"),
	_ = require("underscore"),
	q = require("q");

var cliUtil = require("./util"),
	connectionError = cliUtil.connectionError,
	printMigrationList = cliUtil.printMigrationList,
	handleUninitialized = cliUtil.handleUninitialized;

module.exports = UpCommand;

function UpCommand(opts) {
	this.options = _.extend({
		all: false
	}, opts);
}

UpCommand.prototype.preExecute = function(config) {
	var mite = new Mite(config);

	return mite.connect()
		.fail(connectionError)
		.then(mite._requireInit.bind(mite))
		.fail(handleUninitialized)
		.then(function() {
			return mite;
		});
};

UpCommand.prototype.execute = function(mite) {
	var self = this;
	var pSubUps = q();

	if (self.options.all) {
		var subProvider = submoduleProviderFactory(mite.config.submodules);
		subProvider.on("error", function(e, errPath) {
			var localPath = errPath.replace(mite.config.miteRoot, "");
			if (localPath[0] === "/") {
				localPath = localPath.slice(1);
			}

			reporter.err("Submodule Context Error: %s : %s", e.code, localPath);
		});

		var submodules = subProvider.getSubmodules(mite.config);
		var subTree = new SubmoduleTree(submodules);
		var upOrder = subTree.upExecutionOrder();

		submodules = _.sortBy(submodules, function(s) {
			return upOrder.indexOf(s.name);
		});

		if (submodules.length > 0) {
			pSubUps = submodules.reduce(function(p, sub) {
				return p.then(function() {
					reporter.log("Submodule: " + sub.name);
					reporter.indent();

					var subConfig = JSON.parse(JSON.stringify(mite.config));
					subConfig = cliUtil.applySubmoduleToConfig(subConfig, sub);
					var m = new Mite(subConfig);

					return self._up(m).then(function() {
						console.log();
						reporter.outdent();
					});
				});
			}, pSubUps);
		}
	}

	return pSubUps.then(function() {
		return self._up(mite);
	});
};

UpCommand.prototype._up = function(mite) {
	var opts = {
		submodule: mite.config.name
	},
		provider = new MigrationProvider(mite.config.migrationRoot, opts),
		notifier = function(migrationKey) {
			reporter.success("up: %s...", migrationKey);
		};

	mite.on("migrationExecuted", notifier);

	var p = mite.up(provider.getMigrations(), opts).then(function(upStatus) {
		if (!upStatus.updated && upStatus.wasClean) {
			reporter.warn("no migrations executed. status is clean.");
		} else if (!upStatus.updated && upStatus.dirtyMigrations) {
			printMigrationList("no migrations executed. there are dirty migrations. fix it.", "err", upStatus.dirtyMigrations, "err");
		} else if (upStatus.updated) {
			reporter.success("complete");
		}
	});

	p.
	finally(function() {
		mite.removeListener("migrationExecuted", notifier);
	});

	return p;
};