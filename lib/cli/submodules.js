var reporter = require("./reporter"),
	ContextProvider = require("../submoduleProviders/contextProvider");

module.exports = SubmodulesCommand;

function SubmodulesCommand() {}

SubmodulesCommand.prototype.preExecute = function(config) {
	if(!config.submodules) {
		throw "looks like you disabled submodules...";
	}

	if(config.submodules !== true) {
		throw "invalid submodules configuration";
	}

	return config;
};

SubmodulesCommand.prototype.execute = function(config) {
	// all we support right now is the context provider
	var provider = new ContextProvider();
	var submodules = provider.getSubmodules(config);

	if(submodules.length === 0) {
		reporter.warn("no submodules found");
		return;
	}

	reporter.success("Found %s submodules:", submodules.length);

	submodules.forEach(function(submodule) {
		// reporter.log("\t%s (%s)", submodule.name, submodule.root);
		reporter.write("\t");
		reporter.writeInfo(submodule.name);
		reporter.write(" (");

		//TODO: show this relative to the mite root to save some space
		reporter.write(submodule.root);
		reporter.write(")\n");
	});
};