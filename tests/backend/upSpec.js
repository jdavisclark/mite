require("jasmine-node-promises")();

var Mite = require("../../lib/mite"),
	config = require("../fixtures/mite.config.json"),
	MockRepo = require("../fixtures/mockMigrationRepository");

describe("up from uninitialized state", function () {
	var mite;

	beforeEach(function () {
		mite = new Mite(config, new MockRepo({
			migrations: [],
			tableExists: false
		}));
	});

	it("should fail", function () {
		var self = this;

		return mite.up([]).then(function () {
			self.fail("this should never resolve");
		}, function (failStatus) {
			expect(failStatus.fatal).toBe(true);
			expect(failStatus.initializationRequired).toBe(true);
		});
	});
});


describe("up from clean state", function () {
	var mite,
		migrations;

	beforeEach(function () {
		migrations = [{
			key: "1.sql",
			hash: "lrzmBZxrYf8cKZiBa3UrLj4NyCbZLxxX4uhWWbUc"
		}];

		mite = new Mite(config, new MockRepo({
			tableExists: true,
			migrations: migrations
		}));
	});

	it("should do nothing", function () {
		return mite.up(migrations).then(function (upStatus) {
			expect(upStatus.updated).toBe(false);
			expect(upStatus.wasClean).toBe(true);
		});
	});
});

describe("up from dirty state", function () {
	var upStatus,
		fail = false;

	beforeEach(function (done) {
		var mite = new Mite(config, new MockRepo({
			tableExists: true,
			migrations: [{
				key: "1.sql",
				hash: "5wWaOhJ1pM7yE31XKSf8MBuzAAn8kTcnRzrNWm2G"
			}]
		}));

		var diskMigrations = [{
			key: "1.sql",
			hash: "7i2G3GbyGNTxs78FVDrZrI1D019wV4DUBb0ZZUY0"
		}];

		mite.up(diskMigrations).then(function (status) {
			upStatus = status;
			done();
		}, function () {
			fail = true;
		});
	});

	it("should not update", function () {
		expect(upStatus.updated).toBe(false);
	});

	it("should have dirty migrations property", function () {
		expect(upStatus.dirtyMigrations).not.toBe(undefined);
	});

	it("should have the correct dirty migration", function () {
		expect(upStatus.dirtyMigrations[0]).toEqual("1.sql");
	});
});

describe("up from unexecuted + empty state", function() {
	var status,
		mockRepo,
		mite,
		diskMigrations = [
			{key:"1.sql", hash:"rLr8Wqr1bCwr1TDXBl611mCc7G8wlcSGlCCPhJzQ", sql: "create table firstMigration;"},
			{key: "2.sql", hash:"YwPhNPnsPQ8JPpYrBcbrBmH93CN9JxHwEspM2bG7", sql: "create table secondMigration;"}
		];

	beforeEach(function(done) {
		status = undefined;
		mockRepo = new MockRepo({
			tableExists: true,
			migrations: []
		});
		mite = new Mite(config, mockRepo);

		mite.up(diskMigrations).then(function(upStatus) {
			status = upStatus;
			done();
		});
	});

	it("should update successfully", function() {
		expect(status.updated).toBe(true);
	});

	it("should have a total of 2 executed/tracked", function() {
		return mockRepo.all().then(function(tracked) {
			expect(tracked.length).toBe(2);
		});
	});

	it("should have executed the migrations sequentially", function() {
		return mockRepo.all().then(function(tracked) {
			expect(tracked[0].key).toBe("1.sql");
			expect(tracked[1].key).toBe("2.sql");
		});
	});
});

describe("up from unexecuted state with existing executed migrations", function() {
	var status,
		mockRepo,
		mite,
		diskMigrations,
		dbMigrations;

	beforeEach(function(done) {
		diskMigrations = [
			{key:"1.sql", hash: "c51VLU6JCmXht8rEQLflLFO39H4PaTUaW746yTdG", up: "stuff"},
			{key:"2.sql", hash: "OzwDuFRpx3uhAakteLTXw4rUNV9Cr9PNIngLL69x", up: "more stuff"}
		];

		dbMigrations = [
			diskMigrations[0]
		];

		status = undefined;

		mockRepo = new MockRepo({
			tableExists: true,
			migrations: dbMigrations
		});

		mite = new Mite(config, mockRepo);

		spyOn(mockRepo, "executeMigration").andCallThrough();

		mite.up(diskMigrations).then(function(upStatus) {
			status = upStatus;
			done();
		});
	});

	it("should succeed", function() {
		expect(status.updated).toBe(true);
	});

	it("should have two tracked migrations", function() {
		return mockRepo.all().then(function(allMigrations) {
			expect(allMigrations.length).toBe(2);
		});
	});

	it("should have executed a single migration", function() {
		expect(mockRepo.executeMigration.callCount).toBe(1);
	});

	it("should have executed the correct migration", function() {
		var migrationArg = mockRepo.executeMigration.argsForCall[0][0];
		expect(migrationArg.key).toBe(diskMigrations[1].key);
	});
});