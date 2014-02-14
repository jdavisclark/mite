var fs = require("fs"),
	path = require("path"),
	Sequelize = require("sequelize"),
	q = require('q'),
	qUtil = require("./promiseUtil"),
	MigrationRepository = require("./data/migrationRepository");

module.exports = Mite;

function Mite(config, repo) {
	this.config = config;

	//TODO: switch to native sql drivers and just write platfor specific queries
	this.sequelize = new Sequelize(config.database, config.user, config.password, {
		dialect: config.dialect || "mysql",
		port: config.port || 3306,
		logging: false
	});

	this.models = require("./data/models")(this.sequelize);
	this.migrationRepo = repo || new MigrationRepository(this.sequelize, this.models);
}

Mite.prototype._isInitialized = function () {
	return this.migrationRepo.isInitialized();
};

/*
	create mite database table + any other database initialization

	@return #promise true if the table was created, false if the table already existed.
*/
Mite.prototype.init = function () {
	var self = this,
		def = q.defer();

	self._isInitialized().then(function (initialized) {
		if (initialized) {
			def.resolve(false);
		} else {
			var pCreate = self.migrationRepo.createMigrationTable();
			def.resolve(pCreate);
		}
	});

	return def.promise;
};


Mite.prototype.status = function (diskMigrations) {
	var self = this,
		def = q.defer();

	self.migrationRepo.all().then(function (dbMigrations) {
		var unexecuted = [],
			dirty = [];

		diskMigrations.forEach(function (migration, index) {
			if (index >= dbMigrations.length) {
				unexecuted.push(migration);
			} else {
				var dbMigration = dbMigrations[index];
				if (migration.hash !== dbMigration.hash) {
					dirty.push(migration);
				}
			}
		});

		if (unexecuted.length === 0 && dirty.length === 0 && dbMigrations.length === diskMigrations.length) {
			def.resolve({
				clean: true
			});
			return;
		}

		var result = {
			clean: false
		};

		if(unexecuted.length > 0) {
			result.unexecutedMigrations = unexecuted.map(function (x) {
				return x.key;
			});
		}

		if(dirty.length > 0) {
			result.dirtyMigrations = dirty.map(function (x) {
				return x.key;
			});
		}

		def.resolve(result);
	});

	return def.promise;
};

Mite.prototype.update = function (iterator) {
	var self = this;

	return this.status(iterator).then(function (miteStatus) {
		if (miteStatus.clean) {
			return {
				updated: false,
				wasClean: true
			};
		} else {
			return {};
		}
	});
};