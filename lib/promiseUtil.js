var q = require("q");

exports.errback = function (def) {
	return function (err) {
		def.reject(err);
	}
};