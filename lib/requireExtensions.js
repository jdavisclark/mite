var fs = require("fs");

require.extensions[".sql"] = function(module, path) {
	module.exports = fs.readFileSync(path, "utf8");
}