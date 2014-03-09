require("jasmine-node-promises")();

var Mite = require("../../lib/mite"),
	Migration = require("../../lib/migration"),
	config = require("../fixtures/mite.config.json"),
	MockRepo = require("../fixtures/mockMigrationRepository");

function createMigrations(bases) {
	return bases.map(function(data) {
		return new Migration(data);
	});
}

describe("stepdown from uninitialized state", function () {
	var mite;

	beforeEach(function () {
		mite = new Mite(config, new MockRepo({
			tableExists: false
		}));
	});

	it("should fail due to initialization", function () {
		var self = this;

		return mite.stepDown([]).then(function() {
			self.fail("should never resolve");
		}, function(status) {
			expect(status.initializationRequired).toBe(true);
			expect(status.fatal).toBe(true);
		});
	});
});

describe("stepdown with no executed migrations", function() {
	it("should fail with no unexecuted migrations", function() {
		var mite = new Mite(config, new MockRepo({
			tableExists: true,
			migrations: []
		}));

		return mite.stepDown([]).then(function(downStat) {
			expect(downStat.updated).toBe(false);
			expect(downStat.noExecutedMigrations).toBe(true);
		});
	});

	it("should fail with unexecuted migrations", function() {
		var mite = new Mite(config, new MockRepo({
				tableExists: true,
				migrations: []
			})),
			diskMigrations = createMigrations([
				{key: "1.sql", up:"", down:""}
			]);

		return mite.stepDown(diskMigrations).then(function(downStat) {
			expect(downStat.updated).toBe(false);
			expect(downStat.noExecutedMigrations).toBe(true);
		});
	});
});

describe("stepdown from migration without a down", function() {
	var mite,
		mockRepo,
		diskMigrations,
		dbMigrations,
		status;

	beforeEach(function(done) {
		diskMigrations = createMigrations([
			{key: "1.sql", hash:"hrPitCfgaDZq6u1OXrZVVYqiLPqAik4gtVWYXmYg", up:"the up"}
		]);
		dbMigrations = createMigrations([
			{key: "1.sql", hash:"hrPitCfgaDZq6u1OXrZVVYqiLPqAik4gtVWYXmYg"}
		]);
		mockRepo = new MockRepo({
			tableExists: true,
			migrations: dbMigrations
		});

		spyOn(mockRepo, "executeDownMigration").andCallThrough();

		mite = new Mite(config, mockRepo);
		mite.stepDown(diskMigrations).then(function(downStatus) {
			status = downStatus;
			done();
		}, done);
	});

	it("should fail", function() {
		expect(status.updated).toBe(false);
	});

	it("should be missing the down", function() {
		expect(status.missingDown).toBe(true);
	});

	it("should report the offending migration key", function() {
		expect(status.migrationsInPathWithoutDown.length).toBe(1);
		expect(status.migrationsInPathWithoutDown[0]).toBe("1.sql");
	});

	it("should not have attempted to execute the down", function() {
		expect(mockRepo.executeDownMigration).not.toHaveBeenCalled();
	});
});

describe("stepdown from a simple clean state", function() {
	var mite,
		mockRepo,
		diskMigrations,
		dbMigrations,
		status;

	beforeEach(function(done) {
		diskMigrations = createMigrations([
			{key: "1.sql", hash: "NIZxtDV8hHfJLXsCH0m2wZ7OGOb8ejcyCZIlDBjZ", up:"the up", down:"the down"},
			{key: "2.sql", hash: "zMDBESlxVWWKos7Dps1gw332wEVWUMv7ASByiwOz", up: "the up 2", down: "the down 2"}
		]);
		dbMigrations = createMigrations([
			{key: "1.sql", hash: "NIZxtDV8hHfJLXsCH0m2wZ7OGOb8ejcyCZIlDBjZ"},
			{key: "2.sql", hash: "zMDBESlxVWWKos7Dps1gw332wEVWUMv7ASByiwOz"}
		]);

		mockRepo = new MockRepo({
			tableExists: true,
			migrations: dbMigrations
		});

		spyOn(mockRepo, "executeDownMigration").andCallThrough();

		mite = new Mite(config, mockRepo);

		mite.stepDown(diskMigrations).then(function(downStatus) {
			status = downStatus;
			done();
		}, done);
	});

	it("should succeed", function() {
		expect(status.updated).toBe(true);
	});

	it("should have the correct status + head", function() {
		return mite.status(diskMigrations).then(function(mStatus) {
			expect(mStatus.clean).toBe(false);

			//correct unexecuted migrations
			expect(mStatus.unexecutedMigrations).not.toBe(undefined);
			expect(mStatus.unexecutedMigrations.length).toBe(1);
			expect(mStatus.unexecutedMigrations.pop()).toBe("2.sql");

			//correct head
			expect(mStatus.executedMigrations.length).toBe(1);
			expect(mStatus.executedMigrations.pop()).toBe("1.sql");
		});
	});

	it("should have called executeDownMigration", function() {
		expect(mockRepo.executeDownMigration).toHaveBeenCalled();
		expect(mockRepo.executeDownMigration.callCount).toBe(1);

		var argMigration = mockRepo.executeDownMigration.mostRecentCall.args[0];
		expect(argMigration).toEqual(diskMigrations[diskMigrations.length - 1]);
	});
});

describe("stepdown from a dirty state", function() {
	var mite,
		mockRepo,
		diskMigrations,
		status;

	beforeEach(function(done) {
		diskMigrations = createMigrations([
			{key: "1.sql", hash: "NIZxtDV8hHfJLXsCH0m2wZ7OGOb8ejcyCZIlDBjZ", up:"the up", down:"the down"},
		]);

		mockRepo = new MockRepo({
			tableExists: true,
			migrations: createMigrations([
				{key: "1.sql", hash: "hZds91zGNRtjbeTqjNRvm1zbKfJJWe5q21FDZeZn"}
			])
		});

		spyOn(mockRepo, "executeDownMigration").andCallThrough();

		mite = new Mite(config, mockRepo);

		mite.stepDown(diskMigrations).then(function(downStatus) {
			status = downStatus;
			done();
		}, done);
	});

	it("should succeed", function() {
		expect(status.updated).toBe(true);
	});

	it("should have no migrations with the key from the old head", function() {
		return mockRepo.all().then(function(dbMigrations){
			var some = dbMigrations.some(function(m) {
				return m.key === diskMigrations[0].key;
			});

			expect(some).toBe(false);
		});
	});

	it("should have called executeDownMigration", function() {
		expect(mockRepo.executeDownMigration).toHaveBeenCalled();
		expect(mockRepo.executeDownMigration.callCount).toBe(1);

		var argMigration = mockRepo.executeDownMigration.mostRecentCall.args[0];
		expect(argMigration).toEqual(diskMigrations[0]);
	});
});