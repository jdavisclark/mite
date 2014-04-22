var fs = require("fs"),
	path = require("path"),
	minimatch = require("minimatch");

module.exports = ContextSubmoduleProvider;

function ContextSubmoduleProvider() {}

ContextSubmoduleProvider.prototype.getSubmodules = function(config) {
	var submodules = [];

	walk(config.miteRoot, function(dirPath, dirs, files, abortBranch) {
		var configName = files.filter(function(f) {
			return config.CONFIG_FILENAMES.indexOf(f) > -1;
		})[0];

		var ignored = isIgnored(config, dirPath);

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

		if(ignored) {
			abortBranch();
		}
	});

	return submodules;
};

function isIgnored(config, dirPath) {
	if(!config.ignorePaths) {
		return false;
	}

	var localPath = dirPath.replace(config.miteRoot, "");
	if(localPath[0] === path.sep) {
		localPath = localPath.slice(1);
	}

	return config.ignorePaths.some(function(ignorePattern) {
		return minimatch(localPath, ignorePattern);
	});
}


function walk(start, callback) {
	var stat = fs.statSync(start);

	if (stat.isDirectory()) {
		var filenames = fs.readdirSync(start);

		var coll = filenames.reduce(function(acc, name) {
			var abspath = path.join(start, name);

			if (fs.statSync(abspath).isDirectory()) {
				acc.dirs.push(name);
			} else {
				acc.names.push(name);
			}

			return acc;
		}, {
			"names": [],
			"dirs": []
		});

		var abortBranch = false;
		callback(start, coll.dirs, coll.names, function() {
			abortBranch = true;
		});

		if (!abortBranch) {
			coll.dirs.forEach(function(d) {
				var abspath = path.join(start, d);
				walk(abspath, callback);
			});
		}
	} else {
		throw new Error("path: " + start + " is not a directory");
	}
}