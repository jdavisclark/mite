var fs = require("fs"),
	path = require("path"),
	crypto = require("crypto");

module.exports = MigrationProvider;

function MigrationProvider(migrationRoot) {
	this.migrationRoot = migrationRoot;
}

MigrationProvider.prototype.getMigrations = function (start, end, inclueUp, includeDown) {
	var files = fs.readdirSync(this.migrationRoot),
		self = this;

	if (start) {
		var idx = files.indexOf(start);
		if(idx === -1) {
			throw new Error("start key not found");
		}

		files = files.slice(files.indexOf(start));
	}

	if(end) {
		var idx = files.lastIndexOf(end);
		if(idx === -1) {
			throw new Error("end key not found");
		}
		files = files.slice(0, idx + 1);
	}

	return files.map(function (name) {
		var fullPath = path.join(self.migrationRoot, name);
		hash = crypto.createHash("sha1"),
		migration = {
			key: name,
		},
		contents = fs.readFileSync(fullPath, "utf8");

		migration.up = contents;
		hash.setEncoding("hex");
		hash.write(contents);
		hash.end();

		migration.hash = hash.read();

		return migration;
	});
};