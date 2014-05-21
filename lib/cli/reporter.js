var chalk = require("chalk"),
	format = require("util").format,
	slice = Array.prototype.slice;

var theme = {
	success: chalk.green,
	warn: chalk.yellow,
	err: chalk.red,
	errEmphasis: chalk.red.underline,
	info: chalk.underline,
	offset: chalk.italic
};

function repeat(pattern, count) {
    if (count < 1) return "";
    var result = "";
    while (count > 0) {
        if (count & 1) result += pattern;
        count >>= 1, pattern += pattern;
    }
    return result;
}

var indentChar = " ";
var indentCharCount = 2;
var singleIndent = repeat(indentChar, indentCharCount);
var indentLevel = 0;

function log() {
	var args = slice.call(arguments),
		level = args.shift();

	args[0] = args[0] ? theme[level](args[0]) : "";
	writeIndent();
	console.log.apply(null, args);
}

function writeIndent() {
	if(indentLevel > 0) {
		process.stdout.write(repeat(singleIndent, indentLevel));
	}
}

function write() {
	var out = process.stdout,
		args = slice.call(arguments),
		level = args.shift();

	writeIndent();
	out.write(theme[level](format.apply(null, args)));
}

exports.indent = function() {
	indentLevel++;
};

exports.outdent = function() {
	indentLevel--;
};

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
