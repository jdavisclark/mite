var colors = require("colors"),
	format = require("util").format,
	slice = Array.prototype.slice;

var theme = {
	success: "green",
	warn: "yellow",
	err: "red",
	errEmphasis: ["red", "underline"],
	info: "underline",
	offset: "italics"
};

colors.setTheme(theme);

function log() {
	var args = slice.call(arguments),
		level = args.shift();

	args[0] = args[0] ? args[0][level] : "";
	console.log.apply(null, args);
}

function write() {
	var out = process.stdout,
		args = slice.call(arguments),
		level = args.shift();

	out.write(format.apply(null, args)[level]);
}

exports.log = function() {
	console.log.apply(null, slice.call(arguments));
};

exports.write = function(str) {
	process.stdout.write(str);
};

Object.keys(theme).forEach(function(level) {
	exports[level] = function() {
		log.apply(null, [level].concat(slice.call(arguments)));
	};

	var c = level[0].toUpperCase();
	exports["write" + c + level.slice(1)] = function() {
		write.apply(null, [level].concat(slice.call(arguments)));
	};
});
