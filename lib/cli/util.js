var reporter = require("./reporter"),
	q = require("q"),
	format = require("util").format;

exports.printMigrationList = function(header, level,  migrations, migrationLevel) {
	reporter[level](header);

	migrations.forEach(function(m) {
		reporter[migrationLevel]("\t" + m);
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
			def.reject();
		}
	});

	return def.promise;
};