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

	this.connection.config.queryFormat = function(query, values) {
		if (!values) return query;
		return query.replace(/\:(\w+)/g, function(txt, key) {
			if (values.hasOwnProperty(key)) {
				return this.escape(values[key]);
			}
			return txt;
		}.bind(this));
	};
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
	var errHandler = function (err) {
		errRejector(deferred, err);
	};

	try {
		connection.once("error", errHandler);
		connection.query(sql, params || {}, function (err, result) {
			if (err) {
				errRejector(deferred, err);
			} else deferred.resolve(result);
		});

	} catch (err) {
		errRejector(deferred, err);
	}

	connection.removeListener("error", errHandler);
	return deferred.promise;
};

MigrationRepository.prototype.isInitialized = function () {
	var self = this,
		sql = require("./queries/getMigrationTable.sql"),
		params = {
			schema: self.config.database,
			table: "_migration"
		};

	return self._query(sql, params).then(function (rows) {
		return rows && rows.length === 1 && rows[0].table_name === "_migration";
	});
};

MigrationRepository.prototype.all = function (submodule) {
	var sql = require("./queries/allMigrations.sql");

	return this._query(sql, {submodule: submodule}).then(function (rows) {
		return rows.map(function (row) {
			return {
				key: row.key,
				hash: row.hash
			};
		});
	});
};

MigrationRepository.prototype.initMigrationStorage = function () {
	var migrationsSql = require("./queries/createMigrationsTable.sql");
	return this._query(migrationsSql);
};

MigrationRepository.prototype.executeUpMigration = function (migration) {
	var self = this,
		insertQuery = require("./queries/insertMigration.sql");

	return self._query(migration.up).then(function () {
		var params = {
			key: migration.key,
			hash: migration.hash,
			submodule: migration.submodule || null
		};

		return self._query(insertQuery, params);
	});
};

MigrationRepository.prototype.executeDownMigration = function(migration) {
	var self = this,
		deleteQuery = require("./queries/deleteMigration.sql");

	return self._query(migration.down).then(function() {
		return self._query(deleteQuery, {key: migration.key, submodule: migration.submodule});
	});
};

MigrationRepository.prototype.dropDatabase = function(schema) {
	var self = this;
	//database must be undefined on mite construction.
	return self._query("drop schema if exists " + schema || this.config.database);
};

MigrationRepository.prototype.createDatabase = function(databaseName) {
	var self = this;
	databaseName = databaseName || this.config.database;
	return self._query("create schema " + databaseName);
};

MigrationRepository.prototype.dumpSchema = function(destination){
	var def = q.defer();

	try {
		var cmd = 'mysqldump --comments=0 --compact -d -u'+this.config.user+' -p'+this.config.password + ' ' + this.config.database + " > " + destination;
		//console.log(cmd)
		exec(cmd, function(err){
			if(err) {
				errRejector(def, err);
			}

			return def.resolve();
		});
	}
	catch(err) {
		errRejector(def, err);
	}
	finally {
		return def.promise;
	}
};
