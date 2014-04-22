var fs = require("fs"),
	path = require("path"),
	minimatch = require("minimatch"),
	EventEmitter = require("events").EventEmitter,
	util = require("util");

module.exports = ContextSubmoduleProvider;

function ContextSubmoduleProvider() {
	EventEmitter.call(this);
}
util.inherits(ContextSubmoduleProvider, EventEmitter);

ContextSubmoduleProvider.prototype.getSubmodules = function(config) {
	var self = this;
	var submodules = [];

	this.walk(config.miteRoot, function(err, dirPath, dirs, files, abortBranch) {
		if (err) {
			self.emit("error", err, dirPath);
			return;
		}

		var configName = files.filter(function(f) {
			return config.CONFIG_FILENAMES.indexOf(f) > -1;
		})[0];

		var ignored = self.isIgnored(config, dirPath);

		if (configName && dirPath !== config.miteRoot && !ignored) {
			var txt = fs.readFileSync(path.join(dirPath, configName), "utf8");
			txt = txt.trim();
			var configFile = JSON.parse(txt.length === 0 ? "{}" : txt);

			submodules.push({
				name: path.basename(dirPath),
				miteRoot: dirPath,
				migrationRoot: path.join(dirPath, config.migrationFolderName),
				ignorePaths: configFile.ignorePaths
			});

			abortBranch();
		}

		if (ignored) {
			abortBranch();
		}
	});

	return submodules;
};

ContextSubmoduleProvider.prototype.isIgnored = function(config, dirPath) {
	if (!config.ignorePaths) {
		return false;
	}

	var localPath = dirPath.replace(config.miteRoot, "");
	if (localPath[0] === path.sep) {
		localPath = localPath.slice(1);
	}

	return config.ignorePaths.some(function(ignorePattern) {
		return minimatch(localPath, ignorePattern);
	});
};


ContextSubmoduleProvider.prototype.walk = function(start, callback) {
	var self = this;
	var stat;

	try {
		stat = fs.statSync(start);
	} catch (e) {
		callback(e, start);
		return;
	}

	if (stat.isDirectory()) {
		var filenames = fs.readdirSync(start);

		var coll = filenames.reduce(function(acc, name) {
			var abspath = path.join(start, name);

			try {
				if (fs.statSync(abspath).isDirectory()) {
					acc.dirs.push(name);
				} else {
					acc.names.push(name);
				}
			} catch(e) {
				callback(e, abspath);
			}

			return acc;
		}, {
			"names": [],
			"dirs": []
		});

		var abortBranch = false;
		callback(null, start, coll.dirs, coll.names, function() {
			abortBranch = true;
		});

		if (!abortBranch) {
			coll.dirs.forEach(function(d) {
				var abspath = path.join(start, d);
				self.walk(abspath, callback);
			});
		}
	} else {
		throw new Error("path: " + start + " is not a directory");
	}
}