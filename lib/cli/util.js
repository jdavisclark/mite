var reporter = require("./reporter");

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
		reporter.err("FATAL:" + err);
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