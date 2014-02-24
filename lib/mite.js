var path = require("path"),
	q = require("q"),
	EventEmitter = require("events").EventEmitter,
	util = require("util");

module.exports = Mite;

function Mite(config, repo) {
	this.config = config;
	var MigrationRepository = require("./" + path.join("data/providers/", config.dialect, "provider"));
	this.migrationRepo = repo || new MigrationRepository(config);

	EventEmitter.call(this);
}
util.inherits(Mite, EventEmitter);

Mite.prototype.connect = function() {
	return this.migrationRepo.connect();
};

Mite.prototype.dispose = function() {
	return this.migrationRepo.close();
};

Mite.prototype.dropSchema = function(){
	return this.migrationRepo.dropSchema();
};

Mite.prototype.createSchema = function(databaseName){
	return this.migrationRepo.createSchema(databaseName);
};

Mite.prototype.dumpSchema = function(destination){
	return this.migrationRepo.dumpSchema(destination);
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

Mite.prototype.status = function (diskMigrations, init) {
	var self = this;

	return q.when(init || this._requireInit()).then(function () {
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
					clean: true,
					executedMigrations: dbMigrations.map(function(m) {
						return m.key;
					})
				};
			}

			var result = {
				clean: false,
				executedMigrations: dbMigrations.map(function(m) {
					return m.key;
				})
			};

			if (unexecuted.length > 0) {
				result.unexecutedMigrations = unexecuted.map(function (x) {
					return x.key;
				}).sort();
			}

			if (dirty.length > 0) {
				result.dirtyMigrations = dirty.map(function (x) {
					return x.key;
				}).sort();
			}

			return result;
		});
	});
};

Mite.prototype.up = function (diskMigrations, init, stat) {
	var self = this;

	diskMigrations = diskMigrations.sort(function(a,b) {
		return a.key > b.key;
	});

	return q.when(init || self._requireInit()).then(function () {
		return q.when(stat || self.status(diskMigrations, true)).then(function (miteStatus) {
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
				var target = diskMigrations[diskMigrations.length - 1];
				return self.stepTo(diskMigrations, target, true, miteStatus);
			}
		});
	});
};

Mite.prototype.stepUp = function(diskMigrations, init, stat) {
	var self = this;

	return q.when(init || self._requireInit()).then(function() {
		return q.when(stat || self.status(diskMigrations, true)).then(function(miteStatus) {
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
				diskMigrations = diskMigrations.sort(function(a, b) {
					return a.key > b.key;
				});

				var target = diskMigrations.filter(function(m) {
					return m.key === miteStatus.unexecutedMigrations[0];
				})[0];

				return self.stepTo(diskMigrations, target, true, miteStatus);
			}
		});
	});
};

Mite.prototype.down = function(diskMigrations, init, stat) {
	var self = this;

	return q.when(init || self._requireInit()).then(function() {
		return q.when(stat || self.status(diskMigrations, true)).then(function(miteStatus) {
			if ((miteStatus.clean && diskMigrations.length === 0) || (miteStatus.unexecutedMigrations && miteStatus.unexecutedMigrations.length === diskMigrations.length)) {
				// no executed migrations. cant step down
				return {
					updated: false,
					noExecutedMigrations: true
				};
			} else {
				return self.stepTo(diskMigrations, "bottom", true, miteStatus);
			}
		});
	});
};

Mite.prototype.stepDown = function(diskMigrations, init, stat) {
	var self = this;

	return q.when(init || self._requireInit()).then(function() {
		return q.when(stat || self.status(diskMigrations, true)).then(function(miteStatus) {
			if((miteStatus.clean && diskMigrations.length === 0)	|| (miteStatus.unexecutedMigrations && miteStatus.unexecutedMigrations.length === diskMigrations.length)) {
				// no executed migrations. cant step down
				return {
					updated: false,
					noExecutedMigrations: true
				};
			} else {
				var target;

				//ascending sort
				diskMigrations = diskMigrations.sort(function(a, b) {
					return a.key > b.key;
				});

				if(miteStatus.clean) {
					// we are clean, so we are stepping down from the last migration
					target = diskMigrations.length === 1 ? "bottom" : diskMigrations[diskMigrations.length - 2];
				} else {
					// find the last clean migration
					var downTarget = miteStatus.executedMigrations[miteStatus.executedMigrations.length - 2];

					target = miteStatus.executedMigrations.length === 1 ? "bottom" : diskMigrations.filter(function(m) {
						return m.key === downTarget;
					})[0];
				}

				return self.stepTo(diskMigrations, target, true, miteStatus);
			}
		});
	});
};

Mite.prototype.stepTo = function(diskMigrations, target, init, stat) {
	var self = this,
		bottom = target === "bottom";

	return q.when(init || self._requireInit()).then(function() {
		if (typeof target === "string" && !bottom) {
			target = diskMigrations.filter(function(m) {
				return m.key === target;
			})[0];
		}

		if (!target) {
			return {
				updated: false,
				targetNotFound: true
			};
		}

		// make double sure they are in ascending order
		diskMigrations = diskMigrations.sort(function(a, b) {
			return a.key > b.key;
		});

		return q.when(stat || self.status(diskMigrations, true)).then(function(mStatus) {
			var executed = mStatus.executedMigrations,
				head = executed[executed.length - 1];

			// up
			if (!head || (!bottom && (head < target.key))) {
				// cant go up with dirty migrations. bail out
				if (mStatus.dirtyMigrations) {
					return {
						updated: false,
						dirtyMigrations: mStatus.dirtyMigrations
					};
				}

				var upMigrations = diskMigrations.filter(function(m) {
					return m.key <= target.key && !(mStatus.executedMigrations || []).some(function(em) {
						return em === m.key;
					});
				});

				return upMigrations.reduce(function(p, m) {
					return p.then(self.migrationRepo.executeUpMigration.bind(self.migrationRepo, m)).then(function() {
						self.emit("migrationExecuted", m.key);
					});
				}, q()).then(function() {
					return {
						updated: true
					};
				});
			} else { // down
				// migrations in the path, in descsending order
				var downMigrations = diskMigrations.filter(function(m) {
					return (bottom ? true : m.key > target.key) && !(mStatus.unexecutedMigrations || []).some(function(um) {
						return um === m.key;
					});
				}).reverse();

				// validate that we can actually step all the way to the target
				var missingDowns = downMigrations.filter(function(m) {
					return !m.down || m.down.length === 0;
				});

				// bail out
				if (missingDowns.length > 0) {
					return {
						updated: false,
						unreachableTarget: true,
						missingDown: true,
						migrationsInPathWithoutDown: missingDowns.map(function(m) {
							return m.key;
						})
					};
				}

				// execute the downs serially
				return downMigrations.reduce(function(p, m) {
					return p.then(self.migrationRepo.executeDownMigration.bind(self.migrationRepo, m)).then(function() {
						self.emit("migrationExecuted", m.key);
					});
				}, q()).then(function() {
					return {
						updated: true
					};
				});
			}
		});
	});
};