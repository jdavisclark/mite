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

Mite.prototype._requireInit = function () {
	return this._isInitialized().then(function (initialized) {
		if (!initialized) {
			throw {
				initializationRequired: true,
				fatal: true
			};
		}
	});
};

/*
	create mite database table + any other database initialization

	@return #promise true if the table was created, false if the table already existed.
*/
Mite.prototype.init = function () {
	var self = this;

	return self._isInitialized().then(function (initialized) {
		if (initialized) {
			return {
				initialized: false,
				alreadyInitialized: true
			};
		} else {
			return self.migrationRepo.createMigrationTable().then(function(created) {
				return {
					initialized: created
				};
			});
		}
	});

	return def.promise;
};


Mite.prototype.status = function (diskMigrations) {
	var self = this;

	return this._requireInit().then(function () {
		return self.migrationRepo.all().then(function (dbMigrations) {
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
				return {
					clean: true
				};				
			}

			var result = {
				clean: false
			};

			if (unexecuted.length > 0) {
				result.unexecutedMigrations = unexecuted.map(function (x) {
					return x.key;
				});
			}

			if (dirty.length > 0) {
				result.dirtyMigrations = dirty.map(function (x) {
					return x.key;
				});
			}

			return result;
		});
	});
};


Mite.prototype.up = function (diskMigrations) {
	var self = this;

	return self._requireInit().then(function () {
		return self.status(diskMigrations).then(function (miteStatus) {
			if (miteStatus.clean) {
				return {
					updated: false,
					wasClean: true
				};
			} else if (miteStatus.dirtyMigrations) {
				return {
					updated: false,
					dirtyMigrations: miteStatus.dirtyMigrations
				};
			} else { // unexecuted migrations
				// sequentially execute the migrations
				return diskMigrations.reduce(function(p, migration) {
					return p.then(self.migrationRepo.executeMigration.bind(self.migrationRepo, migration));
				}, q()).then(function() {
					return {
						updated: true
					};
				});
			}
		});
	});
};