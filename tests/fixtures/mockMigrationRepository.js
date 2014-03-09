var q = require("q");

module.exports = MockMigrationRepository;

function MockMigrationRepository(mockConfig) {
	this.migrations = mockConfig.migrations || [];
	this.tableExists = mockConfig.tableExists;
}

MockMigrationRepository.prototype.isInitialized = function() {
	var def = q.defer(),
		self = this;

	process.nextTick(function() {
		def.resolve(!!self.tableExists);
	});

	return def.promise;
};

MockMigrationRepository.prototype.all = function(submodule) {
	var def = q.defer(),
		self = this;

	process.nextTick(function() {
		def.resolve(self.migrations.filter(function(m) {
			return submodule ? m.submodule == submodule : true;
		}));
	});

	return def.promise;
};

MockMigrationRepository.prototype.createMigrationTable = function() {
	var def = q.defer(),
		self = this;

	process.nextTick(function() {
		if(!self.tableExists) {
			self.tableExists = true;
			def.resolve(true);
		} else def.resolve(false);
	});

	return def.promise;
};

MockMigrationRepository.prototype.executeUpMigration = function(migration) {
	var def = q.defer();

	this.migrations.push({
		key: migration.key,
		hash: migration.hash,
		submodule: migration.submodule || null
	});

	process.nextTick(function() {
		def.resolve();
	});

	return def.promise;
};

MockMigrationRepository.prototype.executeDownMigration = function(migration) {
	var def = q.defer(),
		self = this;

	process.nextTick(function() {
		self.migrations = self.migrations.filter(function(m) {
			return m.key !== migration.key && m.submodule == migration.submodule;
		});

		def.resolve();
	});

	return def.promise;
};

