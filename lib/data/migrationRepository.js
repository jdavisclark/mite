require("../requireExtensions");
var q = require("q");

module.exports = MigrationRepository;

function MigrationRepository(sqlize, models) {
	this.models = models;
	this.sqlize = sqlize;
}

MigrationRepository.prototype.isInitialized = function() {
	var def = q.defer();

	this.models
		.Migration
		.findAll({
			limit: 1
		})
		.success(function() {
			def.resolve(true);
		})
		.error(function() {
			def.resolve(false);
		});

	return def.promise;
};

MigrationRepository.prototype.all = function () {
	var def = q.defer();

	this.models
		.Migration
		.findAll({
			order: "`key` DESC"
		})
		.complete(function (err, migrations) {
			if (err) {
				def.reject(err);
			}

			def.resolve(migrations);
		});


	return def.promise;
};

MigrationRepository.prototype.createMigrationTable = function () {
	var def = q.defer();
	var migrationsSql = require("../../sql/migrationSchema.sql");

	this.sqlize
		.query(migrationsSql, null, {
			raw: true
		})
		.complete(function (err) {
			if(err) {
				def.reject(err);
			}
			
			def.resolve(true);
		});
		

	return def.promise;
};

MigrationRepository.prototype.executeMigration = function(migration) {
	var def = q.defer();

	this.sqlize
		.query(migration.sql, null, {
			raw: true
		})
		.complete(function(err) {
			if(err) {
				def.reject(err);
			} else def.resolve();
		});

	return def.promise;
};