require("./requireExtensions");

var fs = require("fs"),
	path = require("path"),
	sqlProviders = require("./sqlProviders");

module.exports = Mite;

function Mite(config) {
	this.config = config;

	if(!sqlProviders[config.dialect]) {
		throw new Error("'" + config.dialect + "' not supported!");
	}

	this.provider = new (sqlProviders[config.dialect])(config);
}

Mite.prototype.init = function(cb) {
	var self = this;

	self.provider.connect(function(err) {
		if(err) {
			cb(err);
			return;
		}

		var migrationsSql = require("../sql/migrationSchema.sql");
		self.provider.query(migrationsSql, {}, function() {
			self.provider.destroy();
			cb.apply(null, arguments);
		});
	});
};

Mite.prototype.status = function(cb) {
	var self = this;

	self.provider.connect(function(err) {
		if(err) {
			cb(err);
			return;
		}

		cb(undefined);
		self.provider.destroy();
	});	
};

Mite.prototype.create = function(cb) {
	var self = this;

	self.provider.connect(function(err) {
		if(err) {
			cb(err);
			return;
		}

		// do stuff

		cb(undefined);
		self.provider.destroy();
	});
};