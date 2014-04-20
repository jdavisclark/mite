var fs = require("fs"),
	path = require("path"),
	minimatch = require("minimatch");

module.exports = ContextSubmoduleProvider;

function ContextSubmoduleProvider() {}

ContextSubmoduleProvider.prototype.getSubmodules = function(config) {
	var submodules = [];

	walk(config.miteRoot, function(dirPath, dirs, files, abortBranch) {
		var isRoot = files.some(function(f) {
			return config.CONFIG_FILENAMES.indexOf(f) > -1;
		});

		if (isRoot && dirPath !== config.miteRoot && !isIgnored(config, dirPath)) {
			submodules.push({
				name: path.basename(dirPath),
				miteRoot: dirPath,
				migrationRoot: path.join(dirPath, config.migrationFolderName)
			});

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