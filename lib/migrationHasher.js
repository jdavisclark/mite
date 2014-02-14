var fs = require("fs"),
	path = require("path"),
	crypto = require("crypto");

module.exports = MigrationHasher;

function MigrationHasher(migrationRoot) {
	this.migrationRoot = migrationRoot;
}

MigrationHasher.prototype.getMigrations = function () {
	var files = fs.readdirSync(this.migrationRoot),
		self = this;

	return files.map(function (name) {
		var fullPath = path.join(self.migrationRoot, name);
		hash = crypto.createHash("sha1"),
		migration = {
			key: name
		},
		contents = fs.readFileSync(fullPath, "utf8");

		hash.setEncoding("hex");
		hash.write(contents);
		hash.end();

		migration.hash = hash.read();

		return migration;
	});
};