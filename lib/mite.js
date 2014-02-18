var path = require("path"),
	q = require("q");

module.exports = Mite;

function Mite(config, repo) {
	this.config = config;
	var MigrationRepository = require("./" + path.join("data/providers/", config.dialect, "provider"));
	this.migrationRepo = repo || new MigrationRepository(config);
}

Mite.prototype.connect = function() {
	return this.migrationRepo.connect();
};

Mite.prototype.dispose = function() {
	return this.migrationRepo.close();
};

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
		} else return true;
	});
};


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

				diskMigrations = diskMigrations.filter(function(m) {
					return miteStatus.unexecutedMigrations.indexOf(m.key) > -1;
				});

				// sequentially execute the migrations
				// TODO: use a progressback to report the currently executing migration?
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

Mite.prototype.stepUp = function(diskMigrations) {
	var self = this;

	return self._requireInit().then(function() {
		return self.status(diskMigrations).then(function(miteStatus) {
			if(miteStatus.clean) {
				return {
					updated: false,
					wasClean: true
				};
			} else if(miteStatus.dirtyMigrations) {
				return {
					updated: false,
					dirtyMigrations: miteStatus.dirtyMigrations
				};
			} else { // unexecuted migrations
				var migration = diskMigrations.filter(function(m) {
					return m.key === miteStatus.unexecutedMigrations[0];
				})[0];

				// TODO: use a progressback to report the currently executing migration?
				return self.migrationRepo.executeMigration(migration).then(function() {
					return {
						updated: true
					};
				});
			}
		});
	});
};