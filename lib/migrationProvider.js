var fs = require("fs"),
	path = require("path"),
	crypto = require("crypto");


const DOWN_HEADER = "/* mite:down */";

module.exports = MigrationProvider;

function MigrationProvider(migrationRoot) {
	this.migrationRoot = migrationRoot;
}

MigrationProvider.prototype.getMigrations = function (start, end) {
	var files = fs.readdirSync(this.migrationRoot),
		self = this;

	// ignore directories
	files = files.filter(function(f) {
		var stat = fs.lstatSync(path.join(self.migrationRoot, f));
		return stat.isFile();
	});

	if (start) {
		var idxStart = files.indexOf(start);
		if(idxStart === -1) {
			throw new Error("start key not found");
		}

		files = files.slice(files.indexOf(start));
	}

	if(end) {
		var idxEnd = files.lastIndexOf(end);
		if(idxEnd === -1) {
			throw new Error("end key not found");
		}
		files = files.slice(0, idxEnd + 1);
	}

	return files.map(function (name) {
		var fullPath = path.join(self.migrationRoot, name),
			hash = crypto.createHash("sha1"),
			migration = {
				key: name,
			},
			contents = fs.readFileSync(fullPath, "utf8");

		var downIdx = contents.indexOf(DOWN_HEADER);

		//TODO: maybe make this a little smarter to add support for writing the down before the ip in the migration file
		if(downIdx) {
			migration.up = contents.substring(0, downIdx);
			migration.down = contents.slice(downIdx);
		} else {
			migration.up = contents;
		}

		hash.setEncoding("hex");
		hash.write(contents);
		hash.end();

		migration.hash = hash.read();

		return migration;
	});
};