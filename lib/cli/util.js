var reporter = require("./reporter");

exports.printMigrationList = function(header, level,  migrations, migrationLevel) {
	reporter[level](header);

	migrations.forEach(function(m) {
		reporter[migrationLevel]("\t" + m);
	});
}