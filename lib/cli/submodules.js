var _ = require("underscore");

var reporter = require("./reporter"),
	submoduleProviderFactory = require("../submoduleProviderFactory"),
	SubmoduleTree = require("../submoduleTree");

module.exports = SubmodulesCommand;

function SubmodulesCommand(opts) {
	this.opts = opts;
}

SubmodulesCommand.prototype.preExecute = function(config) {
	return config;
};

SubmodulesCommand.prototype.execute = function(config) {
	var self = this;

	// all we support right now is the context provider
	var provider = submoduleProviderFactory(config.submodules);
	provider.on("error", function(e, errPath) {
		var localPath = errPath.replace(config.miteRoot, "");
		if (localPath[0] === "/") {
			localPath = localPath.slice(1);
		}

		reporter.err("Submodule Context Error: %s : %s", e.code, localPath);
	});

	var submodules = provider.getSubmodules(config);

	if(self.opts.order) {
		var subTree = new SubmoduleTree(submodules);
		var order = subTree[self.opts.order === "up" ? "upExecutionOrder" : "downExecutionOrder"]();

		submodules = _.sortBy(submodules, function(s) {
			return order.indexOf(s.name);
		});
	}

	if(submodules.length === 0) {
		if(!self.opts.bare) {
			reporter.warn("no submodules found");
		}

		return;
	}

	if(!self.opts.bare) {
		reporter.success("Found %s submodules:", submodules.length);
	}

	submodules.forEach(function(submodule) {
		if(self.opts.bare) {
			reporter.log("%s", submodule.name);
		} else {
			// reporter.log("\t%s (%s)", submodule.name, submodule.root);
			reporter.write("\t");
			reporter.writeInfo(submodule.name);
			reporter.write(" (");

			//TODO: show this relative to the mite root to save some space
			reporter.write(submodule.miteRoot);
			reporter.write(")\n");
		}
	});
};