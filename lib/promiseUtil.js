exports.errback = function (def) {
	return function (err) {
		def.reject(err);
	};
};