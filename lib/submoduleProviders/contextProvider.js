var walk = require("file").walkSync,
	path = require("path");

module.exports = ContextSubmoduleProvider;

function ContextSubmoduleProvider () {}

ContextSubmoduleProvider.prototype.getSubmodules = function(config) {
	var submodules = [];

	walk(config.miteRoot, function(dirPath, dirs, files) {
		var isRoot = files.some(function(f) {
			return config.CONFIG_FILENAMES.indexOf(f) > -1;
		});

		if(isRoot && dirPath !== config.miteRoot) {
			submodules.push({
				name: path.basename(dirPath),
				miteRoot: dirPath,
				migrationRoot: path.join(dirPath, config.migrationFolderName)
			});
		}
	});

	return submodules;
};