var colors = require("colors"),
	format = require("util").format,
	slice = Array.prototype.slice;

colors.setTheme({
	success: "green",
	warn: "yellow",
	err: "red",
	errEmphasis: ["red", "underline"],
	info: "underline"
});

function log() {
	var args = slice.call(arguments),
		level = args.shift();

	args[0] = args[0] ? args[0][level] : "";
	console.log.apply(null, args);
}

["success", "warn", "err", "errEmphasis", "info"].forEach(function(level) {
	exports[level] = function() {
		log.apply(null, [level].concat(slice.call(arguments)));
	};
});
