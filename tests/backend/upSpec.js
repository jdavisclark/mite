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
	var upStatus;

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
		}, done);
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
		}, done);
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
			{key:"1.sql", hash: "c51VLU6JCmXht8rEQLflLFO39H4PaTUaW746yTdG"},
		];

		status = undefined;

		mockRepo = new MockRepo({
			tableExists: true,
			migrations: dbMigrations
		});

		mite = new Mite(config, mockRepo);

		spyOn(mockRepo, "executeUpMigration").andCallThrough();

		mite.up(diskMigrations).then(function(upStatus) {
			status = upStatus;
			done();
		}, done);
	});

	it("should succeed", function() {
		expect(status.updated).toBe(true);
	});

	it("should have two tracked migrations", function() {
		return mockRepo.all().then(function(allMigrations) {
			expect(allMigrations.length).toBe(2);
		});
	});

	it("should have called executeUpMigration", function() {
		expect(mockRepo.executeUpMigration).toHaveBeenCalled();
	});

	it("should have executed a single migration", function() {
		expect(mockRepo.executeUpMigration.callCount).toBe(1);
	});

	it("should have executed the correct migration", function() {
		var migrationArg = mockRepo.executeUpMigration.argsForCall[0][0];
		expect(migrationArg.key).toBe(diskMigrations[1].key);
	});
});

describe("up", function() {
	var diskMigrations,
		dbMigrations,
		repo,
		mite,
		upStat;

	beforeEach(function() {
		diskMigrations = [
			{key:"2014-02-17.sql", hash: "6QNbMGYnQUXzWz0dmkxA4FHfh3tJv9Cn7Ozqe10b", up: "the up", down: "the down"},
			{key:"2014-02-18T17-50-55.sql", hash: "XZi9plrO13VMDU5C7mkrIeWboSyTEa5c6huHsxf6", up: "the up", down: "the down"},
			{key:"2014-02-21T15-35-59.sql", hash: "eQ3b58J3SPga4tvFE4MjMy3IjTgYhsTYWaFWumBd", up: "the up", down: "the down"},
			{key:"2014-02-21T18-02-24.sql", hash: "cwC5EzQ8u3MScCLwXf3rtDZhPbVxCxxRWwAdA7oY", up: "the up", down: "the down"},
			{key:"2014-02-22T17-13-35Z.sql", hash: "fvEWwq18yKgRoY4j389kKmYFNP1mnk1wVDgmxZPk", up: "the up", down: "the down"},
			{key:"2014-02-25T18-56-36.sql", hash: "M2xpX29Qz9VVkpy5cdcw29cQ78PUYXvPrc5Qs1i9", up: "the up", down: "the down"},
			{key:"2014-03-02T13-08-16Z.sql", hash: "boLiPZC0mqxszqK2ovJd04RiFaN6wJHsCd4UbsRf", up: "the up", down: "the down"},
			{key:"2014-03-09T19-16-32Z.sql", hash: "Azes9abK3X9TMXrBLiwddJMr1Qok3vxtgHp5CZzr", up: "the up", down: "the down"},
			{key:"2014-03-11T16-36-15Z.sql", hash: "6ePmrxDLu7Zg0iDUdOuyzWjnZbeKrLdCCathCYNj", up: "the up", down: "the down"},
			{key:"2014-03-12T14-54-19Z.sql", hash: "milWR3htywsMnWT6gUQb5fWIdkde6oV09h9iEBth", up: "the up", down: "the down"},
			{key:"2014-03-14T02-13-27Z.sql", hash: "1rs8o0RDjyVzbpRfKTy1pJ5ordVKFLHueydYqPDA", up: "the up", down: "the down"}
		];
		dbMigrations = [
			{key:"2014-02-17.sql", hash: "6QNbMGYnQUXzWz0dmkxA4FHfh3tJv9Cn7Ozqe10b"},
			{key:"2014-02-18T17-50-55.sql", hash: "XZi9plrO13VMDU5C7mkrIeWboSyTEa5c6huHsxf6"},
			{key:"2014-02-21T15-35-59.sql", hash: "eQ3b58J3SPga4tvFE4MjMy3IjTgYhsTYWaFWumBd"},
			{key:"2014-02-21T18-02-24.sql", hash: "cwC5EzQ8u3MScCLwXf3rtDZhPbVxCxxRWwAdA7oY"},
			{key:"2014-02-22T17-13-35Z.sql", hash: "fvEWwq18yKgRoY4j389kKmYFNP1mnk1wVDgmxZPk"},
			{key:"2014-02-25T18-56-36.sql", hash: "M2xpX29Qz9VVkpy5cdcw29cQ78PUYXvPrc5Qs1i9"},
			{key:"2014-03-02T13-08-16Z.sql", hash: "boLiPZC0mqxszqK2ovJd04RiFaN6wJHsCd4UbsRf"},
			{key:"2014-03-09T19-16-32Z.sql", hash: "Azes9abK3X9TMXrBLiwddJMr1Qok3vxtgHp5CZzr"},
			{key:"2014-03-11T16-36-15Z.sql", hash: "6ePmrxDLu7Zg0iDUdOuyzWjnZbeKrLdCCathCYNj"},
			{key:"2014-03-12T14-54-19Z.sql", hash: "milWR3htywsMnWT6gUQb5fWIdkde6oV09h9iEBth"}
		];

		repo = new MockRepo({
			tableExists: true,
			migrations: dbMigrations
		});

		mite = new Mite(config, repo);

		return mite.up(diskMigrations).then(function(stat) {
			upStat = stat;
		});
	});

	it("should succeed", function() {
		expect(upStat.updated).toBe(true);
	});

	it("should not have dirty migrations", function() {
		expect(upStat.dirtyMigrations).toBe(undefined);
	});
});