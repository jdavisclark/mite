require("../../../requireExtensions");

var q = require("q"),
	exec = require("child_process").exec,
	mysql = require("mysql");

module.exports = MigrationRepository;

function MigrationRepository(config) {
	this.config = config;
	this.connection = mysql.createConnection({
		host: config.host,
		port: config.port || 3306,
		database: config.database,
		user: config.user,
		password: config.password,
		multipleStatements: true
	});
}

function errRejector (def, err) {
	if(err instanceof Error) {
		def.reject(err.message);
	} else {
		def.reject(err);
	}
}

MigrationRepository.prototype.connect = function() {
	var def = q.defer();

	try {
		this.connection.connect(function(err) {
			if(err) {
				errRejector(def, err);
			} else def.resolve();
		});
	}
	catch(err) {
		errRejector(def, err);
	}
	finally {
		return def.promise;
	}
};

MigrationRepository.prototype.close = function () {
	var def = q.defer();

	this.connection.end(function (err) {
		if (err) {
			errRejector(def, err);
		} else def.resolve();
	});

	return def.promise;
};

MigrationRepository.prototype._query = function (sql, params) {
	var connection = this.connection;
	var deferred = q.defer();
	try {
		connection.once("error", function (err) {
			errRejector(deferred, err);
		});

		connection.query(sql, params || [], function (err, result) {
			if (err) {
				errRejector(deferred, err);
			} else deferred.resolve(result);
		});

	} catch (err) {
		errRejector(deferred, err);
	}

	return deferred.promise;
};

MigrationRepository.prototype.isInitialized = function () {
	var self = this,
		sql = require("./queries/getMigrationTable.sql");

	return self._query(sql, [self.config.database, "_migration"]).then(function (rows) {
		return rows && rows.length === 1 && rows[0].table_name === "_migration";
	});
};

MigrationRepository.prototype.all = function () {
	return this._query("select * from _migration;").then(function (rows) {
		return rows.map(function (row) {
			return {
				key: row.key,
				hash: row.hash
			};
		});
	});
};

MigrationRepository.prototype.createMigrationTable = function () {
	var migrationsSql = require("./queries/createMigrationsTable.sql");
	return this._query(migrationsSql);
};

MigrationRepository.prototype.executeUpMigration = function (migration) {
	var self = this,
		insertQuery = require("./queries/insertMigration.sql");

	return self._query(migration.up).then(function () {
		return self._query(insertQuery, [migration.key, migration.hash]);
	});
};

MigrationRepository.prototype.executeDownMigration = function(migration) {
	var self = this,
		deleteQuery = require("./queries/deleteMigration.sql");

	return self._query(migration.down).then(function() {
		return self._query(deleteQuery, [migration.key]);
	});
};
MigrationRepository.prototype.dropSchema = function() {
	var self = this;
	//database must be undefined on mite construction.
	return self._query("drop schema " + this.config.database);
};
MigrationRepository.prototype.createSchema = function(databaseName) {
	var self = this;
	databaseName = databaseName || this.config.database
	return self._query("create schema " + databaseName);
};
MigrationRepository.prototype.dumpSchema = function(destination){
	var self = this;
	var def = q.defer();
	try {
		var cmd = 'mysqldump -d -u'+this.config.user+' -p'+this.config.password + ' ' + this.config.database + " | sed 's/ AUTO_INCREMENT=[0-9]*//g' | sed 's/^-- Host:.*$//' > " + destination;
		//console.log(cmd)
		exec(cmd, function(err, stdin, stdout){
			if(err) {
				errRejector(def, err);
			}
			return def.resolve();
		})
	}
	catch(err) {
		errRejector(def, err);
	}
	finally {
		return def.promise;
	}
}
