var path = require("path"),
	q = require("q"),
	_ = require("underscore");

var Mite = require("../mite"),
	MigrationProvider = require("../migrationProvider"),
	reporter = require("./reporter"),
	miteUtil = require("./util"),
	printMigrationList = miteUtil.printMigrationList,
	connectionError = miteUtil.connectionError,
	handleUninitialized = miteUtil.handleUninitialized;

module.exports = CompareCommand;

function CompareCommand(opts) {
	this.options = opts || {};
}

CompareCommand.prototype.preExecute = function(config) {
	var mite = new Mite(config);

	return mite.connect()
		.fail(connectionError)
		.then(mite._requireInit.bind(mite))
		.fail(handleUninitialized)
		.then(function() {
			return mite;
		});
};

CompareCommand.prototype.execute = function(mite) {
	var opts = {
		submodule: mite.config.name
	};

	var provider = new MigrationProvider(mite.config.migrationRoot, opts);
	var diskMigrations = provider.getMigrations();
	diskMigrations = _.sortBy(diskMigrations, function(m) {
		return m.key;
	});

	return mite.allMigrations(opts).then(function(dbMigrations) {
		reporter.writeInfo("Key");
		reporter.write(", ");
		reporter.writeInfo("Disk Hash");
		reporter.write(", ");
		reporter.writeInfo("Tracked Hash");
		reporter.write("\n");

		var pairs = {};

		diskMigrations.forEach(function(m) {
			pairs[m.key] = {
				disk: m.hash
			};
		});

		dbMigrations.forEach(function(m) {
			pairs[m.key] = pairs[m.key] || {};
			pairs[m.key].tracked = m.hash;
		});

		_.sortBy(Object.keys(pairs), function(k) {
			return k;
		}).forEach(function(key) {
			var pair = pairs[key];
			var logger = pair.disk === pair.tracked ? reporter.success : !pair.tracked || !pair.disk ? reporter.warn : reporter.err;

			logger("%s:  %s\t%s", key, pair.disk, pair.tracked);
		});
	});
};