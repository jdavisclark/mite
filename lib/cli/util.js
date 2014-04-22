var reporter = require("./reporter"),
	q = require("q"),
	format = require("util").format,
	_ = require("underscore");

exports.printMigrationList = function(header, level,  migrations, migrationLevel) {
	reporter[level](header);

	migrations.forEach(function(m) {
		reporter[migrationLevel](m);
	});
};

exports.handleUninitialized = function handleUninitialized() {
	reporter.err("fatal: not in an initialized mite project");
	process.exit(1);
};

exports.handleError = function handleError(err) {
	if (err) {
		reporter.err("fatal: " + err);
		process.exit(1);
	}
};

exports.connectionError = function connectionError(err) {
	if (err) {
		reporter.err("Mite Connection Error: " + err);
		process.exit(1);
	}
};

exports.forceExit = function forceExit(code) {
	process.exit(code || 0);
};

exports.pQuestion = function pQuestion(rl, text) {
	var def = q.defer();
	rl.question(text, function (resp) {
		resp = resp.replace(/^\s+|\s+$/g, ""); // trim
		resp = resp.length > 0 ? resp : null;
		def.resolve(resp);
	});

	return def.promise;
}

exports.confirmDestructiveCommand = function(rl, cmd) {
	var def = q.defer();
	rl.question(format("%s is potentially destructive. Continue? (y/N): ", cmd || "this" ), function(resp) {
		if(resp.toLowerCase() === "y") {
			def.resolve();
		} else {
			def.reject("aborted");
		}
	});

	return def.promise;
};

exports.applySubmoduleToConfig = function(config, submodule) {
	config.isSubmodule = true;
	var ignorePaths = _.uniq(config.ignorePaths.concat(submodule.ignorePaths || []));

	return _.extend({}, config, submodule, {
		ignorePaths: ignorePaths
	});
};