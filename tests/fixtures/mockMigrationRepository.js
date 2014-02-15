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

MockMigrationRepository.prototype.all = function() {
	var def = q.defer(),
		self = this;

	process.nextTick(function() {
		def.resolve(self.migrations);
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
	})

	return def.promise;
};

