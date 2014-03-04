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

exports.success = function() {
	log.apply(null, ["success"].concat(slice.call(arguments)));
};

exports.warn = function() {
	log.apply(null, ["warn"].concat(slice.call(arguments)));
};

exports.err = function() {
	log.apply(null, ["err"].concat(slice.call(arguments)));
};

exports.errEmphasis = function() {
	log.apply(null, ["errEmphasis"].concat(slice.call(arguments)));
};

exports.info = function() {
	log.apply(null, ["info"].concat(slice.call(arguments)));
};