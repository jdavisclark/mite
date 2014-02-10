var mysql = require("mysql");

module.exports = MySqlProvider;

function MySqlProvider (config) {
	this.config = config;
	this.connection = mysql.createConnection({
		host: this.config.host,
		user: this.config.user,
		password: this.config.password,
		database: this.config.database
	});
}

MySqlProvider.prototype.connect = function(cb) {
	this.connection.connect(function(err) {
		cb(err);
	});
}

MySqlProvider.prototype.query = function(sql, params, cb) {
	sql = mysql.format(sql, params);
	this.connection.query(sql, cb);
};

MySqlProvider.prototype.destroy = function() {
	this.connection.destroy();
};
