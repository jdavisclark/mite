var glob = require("glob").sync,
	path = require("path");

module.exports = ContextSubmoduleProvider;

function ContextSubmoduleProvider () {}

ContextSubmoduleProvider.prototype.getSubmodules = function(config) {
	var submoduleConfigPaths = glob("**/.mite", {
		cwd: config.miteRoot
	});

	var submodules = submoduleConfigPaths.map(function(x) {
		var dir = path.dirname(x);
		var root = path.resolve(dir);

		return {
			name: path.basename(dir),
			root: root,
			migrationRoot: path.join(root, config.migrationFolderName)
		};
	});

	// the current directory isn't a submodule..it's the main mite project
	return submodules.filter(function(x) {
		return x.name !== ".";
	});
};