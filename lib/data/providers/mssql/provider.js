require("../../../requireExtensions");

var q = require("q"),
	sql = require("mssql");

module.exports = MsSqlMigrationRepository;

function MsSqlMigrationRepository(config) {
	this.config = config;
}

MsSqlMigrationRepository.prototype.connect = function() {
	var def = q.defer();
	var conConfig = {
		server: this.config.host,
		port: this.config.port,
		database: this.config.database,
		user: this.config.user,
		password: this.config.password,
		driver: "tedious"
	};

	var conHandler = function(err) {
		if(err) {
			def.reject(err);
		} else def.resolve();
	};

	sql.connect(conConfig, conHandler);

	return def.promise;
};

MsSqlMigrationRepository.prototype.close = function() {
	sql.close();
};

MsSqlMigrationRepository.prototype._query = function(query, params) {
	var req = new sql.Request();
	var def = q.defer();

	Object.keys(params || {}).forEach(function(key) {
		req.input(key, params[key]);
	});

	req.query(query, function(err, result) {
		if(err) {
			def.reject(err);
		} else def.resolve(result);
	});

	return def.promise;
};

MsSqlMigrationRepository.prototype.isInitialized = function() {
	var self = this;
	var sql = require("./queries/getMigrationTable.sql");
	var params = {
		schema: self.config.database,
		table: "_migration"
	};

	return self._query(sql, params).then(function (rows) {
		return rows && rows.length === 1 && rows[0].table_name === "_migration";
	});
};

MsSqlMigrationRepository.prototype.all = function (submodule) {
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

MsSqlMigrationRepository.prototype.initMigrationStorage = function () {
	var migrationsSql = require("./queries/createMigrationsTable.sql");
	return this._query(migrationsSql).then(function() {
		return true;
	});
};

MsSqlMigrationRepository.prototype.executeUpMigration = function (migration) {
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

MsSqlMigrationRepository.prototype.executeDownMigration = function(migration) {
	var self = this,
		deleteQuery = require("./queries/deleteMigration.sql");

	return self._query(migration.down).then(function() {
		return self._query(deleteQuery, {key: migration.key, submodule: migration.submodule});
	});
};

MsSqlMigrationRepository.prototype.dropDatabase = function(schema) {
	var self = this;
	var dropQuery = require("./queries/dropDatabaseIfExists.sql");
	dropQuery = dropQuery.replace(":schema", schema || this.config.database);

	return self._query(dropQuery, {
		schema: schema || this.config.database
	});
};

MsSqlMigrationRepository.prototype.createDatabase = function(databaseName) {
	var self = this;
	databaseName = databaseName || this.config.database;

	return self._query("create database " + databaseName);
};

MsSqlMigrationRepository.prototype.dumpSchema = function(destination){
	throw new Error("dumpSchema not implemented");
};