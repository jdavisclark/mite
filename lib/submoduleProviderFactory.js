module.exports =  function(submodules) {
	if(!submodules) {
		return;
	}

	var Provider;

	switch(typeof submodules) {
		case "boolean":
			Provider = require("./submoduleProviders/contextProvider");
			break;
		default:
			throw new Error("no submodule provider available");
	}

	return new Provider();
};