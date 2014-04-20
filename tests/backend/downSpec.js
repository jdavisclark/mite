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

describe("down from uninitialized state", function () {
	var mite;

	beforeEach(function () {
		mite = new Mite(config, new MockRepo({
			tableExists: false
		}));
	});

	it("should fail due to initialization", function () {
		var self = this;

		return mite.down([]).then(function() {
			self.fail("should never resolve");
		}, function(status) {
			expect(status.initializationRequired).toBe(true);
			expect(status.fatal).toBe(true);
		});
	});
});

describe("down with no executed migrations", function() {
	it("should fail with no unexecuted migrations", function() {
		var mite = new Mite(config, new MockRepo({
			tableExists: true,
			migrations: []
		}));

		return mite.down([]).then(function(downStat) {
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

		return mite.down(diskMigrations).then(function(downStat) {
			expect(downStat.updated).toBe(false);
			expect(downStat.noExecutedMigrations).toBe(true);
		});
	});
});

describe("down with migrations missing down", function() {
	var mite,
		mockRepo,
		diskMigrations,
		dbMigrations,
		status;

	beforeEach(function(done) {
		diskMigrations = createMigrations([
			{key: "1.sql", hash:"hrPitCfgaDZq6u1OXrZVVYqiLPqAik4gtVWYXmYg", up:"the up"},
			{key: "2.sql", hash:"UwktX4l0Xk0xBRaBvhPP9T6AuvxVsH2TxD9ZbBbD", up:"the up", down: "the down"},
			{key: "3.sql", hash:"Ou3z3fZK4LpS5Rd8g0so6nqZbladwjUtpQ5YjJyK", up:"the up"}
		]);
		dbMigrations = createMigrations([
			{key: "1.sql", hash:"hrPitCfgaDZq6u1OXrZVVYqiLPqAik4gtVWYXmYg"},
			{key: "2.sql", hash:"UwktX4l0Xk0xBRaBvhPP9T6AuvxVsH2TxD9ZbBbD"},
			{key: "3.sql", hash:"Ou3z3fZK4LpS5Rd8g0so6nqZbladwjUtpQ5YjJyK"}
		]);
		mockRepo = new MockRepo({
			tableExists: true,
			migrations: dbMigrations
		});

		spyOn(mockRepo, "executeDownMigration").andCallThrough();

		mite = new Mite(config, mockRepo);
		mite.down(diskMigrations).then(function(downStatus) {
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
		expect(status.migrationsInPathWithoutDown.length).toBe(2);
		expect(status.migrationsInPathWithoutDown[1]).toBe("1.sql");
		expect(status.migrationsInPathWithoutDown[0]).toBe("3.sql");
	});

	it("should not have attempted to execute the down", function() {
		expect(mockRepo.executeDownMigration).not.toHaveBeenCalled();
	});
});

describe("down from a simple clean state", function() {
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

		mite.down(diskMigrations).then(function(downStatus) {
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
			expect(mStatus.unexecutedMigrations.length).toBe(2);

			//executed
			expect(mStatus.executedMigrations.length).toBe(0);
		});
	});

	it("should have called executeDownMigration", function() {
		expect(mockRepo.executeDownMigration).toHaveBeenCalled();
		expect(mockRepo.executeDownMigration.callCount).toBe(2);

		expect(mockRepo.executeDownMigration.calls[0].args[0]).toEqual(diskMigrations[1]);
		expect(mockRepo.executeDownMigration.calls[1].args[0]).toEqual(diskMigrations[0]);
	});
});
