var path = require("path"),
	fs = require("fs"),
	reporter = require("./reporter"),
	q = require("q");

module.exports = CreateCommand;

function CreateCommand(){}

CreateCommand.prototype.execute = function(mite, miteRoot) {
	var def = q.defer(),
		migrationRoot = path.join(miteRoot, "migrations"),
		isoString = (new Date()).toISOString(),
		filename = (isoString.substring(0, isoString.lastIndexOf(".")) + "Z").replace(/\:/g, "-") + ".sql";

	try {
		fs.writeFileSync(path.join(migrationRoot, filename), require("../../templates/migration.sql"));
		reporter.success("migration created: " + filename);
	} catch (e) {
		reporter.err(e.toString());
	}

	def.resolve();
	return def.promise;
};