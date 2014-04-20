require("jasmine-node-promises")();

var Mite = require("../../lib/mite"),
	Migration = require("../../lib/migration"),
	config = require("../fixtures/mite.config.json"),
	MockRepo = require("../fixtures/mockMigrationRepository");

function createMigrations (bases) {
	return bases.map(function(data) {
		return new Migration(data);
	});
}

describe("step to from uninitialized state", function() {
	var diskMigrations,
		dbMigrations,
		mockRepo,
		mite,
		status;

	beforeEach(function(done) {
		diskMigrations = createMigrations([
			{key:"1.sql", hash: "esG2ryrJVdRVnlqggZ3Qs4Fc8KIM8tZVqwS2qZIO", up:"the up", down:"the down"}
		]);
		dbMigrations = null;
		mockRepo = new MockRepo({
			tableExists: false,
			migrations: dbMigrations
		});
		mite = new Mite(config, mockRepo);

		mite.stepTo(diskMigrations, diskMigrations[0]).then(done, function(err) {
			status = err;
			done();
		});
	});

	it("should fail", function() {
		expect(status.fatal).toBe(true);
		expect(status.initializationRequired).toBe(true);
	});
});

describe("step to (up) single migration", function() {
	var diskMigrations,
		dbMigrations,
		mockRepo,
		mite,
		status;

	beforeEach(function(done) {
		diskMigrations = createMigrations([
			{key:"1.sql", hash: "YmDVV6pPO1aPoLngJHgFeZqYEmrSTLwT6KAJQ6n0", up:"the up", down:"the down"}
		]);
		dbMigrations = [];
		mockRepo = new MockRepo({
			tableExists: true,
			migrations: dbMigrations
		});

		spyOn(mockRepo, "executeUpMigration").andCallThrough();
		mite = new Mite(config, mockRepo);

		mite.stepTo(diskMigrations, diskMigrations[0]).then(function(stepStatus) {
			status = stepStatus;
			done();
		}, done);
	});

	it("should succeed", function() {
		expect(status.updated).toBe(true);
	});

	it("should have called executeUpMigration", function() {
		expect(mockRepo.executeUpMigration).toHaveBeenCalled();
		expect(mockRepo.executeUpMigration.callCount).toBe(1);

		var arg = mockRepo.executeUpMigration.mostRecentCall.args[0];
		expect(arg).toBe(diskMigrations[0]);
	});

	it("should be clean with the correct head", function() {
		return mite.status(diskMigrations).then(function(mStatus) {
			expect(mStatus.clean).toBe(true);
			expect(mStatus.executedMigrations.length).toBe(1);
			expect(mStatus.executedMigrations[0]).toBe(diskMigrations[0].key);
		});
	});
});

describe("step to (up) multiple migrations", function() {
	var diskMigrations,
		dbMigrations,
		mockRepo,
		mite,
		status;

	beforeEach(function(done) {
		diskMigrations = createMigrations([
			{key:"1.sql", hash: "YmDVV6pPO1aPoLngJHgFeZqYEmrSTLwT6KAJQ6n0", up:"the up", down:"the down"},
			{key:"2.sql", hash: "UXiQXcTvKwcstYYVKwwLuVtL8XHpjWFrstJhkvxi", up:"the up 2", down:"the down 2"},
			{key:"3.sql", hash: "PbwtnAE7IGFjy9Ejvo16Lt58XPvDyHoQpd7jooPo", up:"the up 3", down:"the down 3"}
		]);
		dbMigrations = [];
		mockRepo = new MockRepo({
			tableExists: true,
			migrations: dbMigrations
		});

		spyOn(mockRepo, "executeUpMigration").andCallThrough();
		mite = new Mite(config, mockRepo);

		mite.stepTo(diskMigrations, diskMigrations[2]).then(function(stepStatus) {
			status = stepStatus;
			done();
		}, done);
	});

	it("should succeed", function() {
		expect(status.updated).toBe(true);
	});

	it("should have correctly called executeUpMigration", function() {
		expect(mockRepo.executeUpMigration).toHaveBeenCalled();
		expect(mockRepo.executeUpMigration.callCount).toBe(3);

		mockRepo.executeUpMigration.calls.forEach(function(call, i) {
			var arg = call.args[0];
			expect(arg).toBe(diskMigrations[i]);
		});
	});

	it("should be clean with the correct head", function() {
		return mite.status(diskMigrations).then(function(mStatus) {
			expect(mStatus.clean).toBe(true);
			expect(mStatus.executedMigrations.length).toBe(3);
			expect(mStatus.executedMigrations[mStatus.executedMigrations.length - 1]).toBe(diskMigrations[diskMigrations.length - 1].key);
		});
	});
});

describe("step to (down) single migration", function() {
	var diskMigrations,
		dbMigrations,
		mockRepo,
		mite,
		status;

	beforeEach(function(done) {
		diskMigrations = createMigrations([
			{key:"1.sql", hash: "YmDVV6pPO1aPoLngJHgFeZqYEmrSTLwT6KAJQ6n0", up:"the up", down:"the down"},
			{key:"2.sql", hash: "UXiQXcTvKwcstYYVKwwLuVtL8XHpjWFrstJhkvxi", up:"the up 2", down:"the down 2"}
		]);
		dbMigrations = createMigrations([
			{key:"1.sql", hash: "YmDVV6pPO1aPoLngJHgFeZqYEmrSTLwT6KAJQ6n0"},
			{key:"2.sql", hash: "UXiQXcTvKwcstYYVKwwLuVtL8XHpjWFrstJhkvxi"}
		]);
		mockRepo = new MockRepo({
			tableExists: true,
			migrations: dbMigrations
		});

		spyOn(mockRepo, "executeDownMigration").andCallThrough();
		mite = new Mite(config, mockRepo);

		mite.stepTo(diskMigrations, diskMigrations[0]).then(function(stepStatus) {
			status = stepStatus;
			done();
		}, done);
	});

	it("should succeed", function() {
		expect(status.updated).toBe(true);
	});

	it("should have correctly called executeDownMigration", function() {
		expect(mockRepo.executeDownMigration).toHaveBeenCalled();
		expect(mockRepo.executeDownMigration.callCount).toBe(1);
		expect(mockRepo.executeDownMigration.mostRecentCall.args[0]).toBe(diskMigrations[1]);
	});

	it("should have unexecuted migrations with the correct head", function() {
		return mite.status(diskMigrations).then(function(mStatus) {
			expect(mStatus.clean).toBe(false);

			expect(mStatus.unexecutedMigrations.length).toBe(1);
			expect(mStatus.unexecutedMigrations[0]).toBe(diskMigrations[diskMigrations.length - 1].key);

			expect(mStatus.executedMigrations.length).toBe(1);
			expect(mStatus.executedMigrations[mStatus.executedMigrations.length - 1]).toBe(diskMigrations[0].key);
		});
	});
});

describe("step to (down) multiple migrations", function() {
	var diskMigrations,
		dbMigrations,
		mockRepo,
		mite,
		status;

	beforeEach(function(done) {
		diskMigrations = createMigrations([
			{key:"1.sql", hash: "YmDVV6pPO1aPoLngJHgFeZqYEmrSTLwT6KAJQ6n0", up:"the up", down:"the down"},
			{key:"2.sql", hash: "P4BjPoJNSu5lbUwJLllNQ9LJCMeK53WDTA9OkbL9", up:"the up 2", down:"the down 2"}, // target HEAD
			{key:"3.sql", hash: "W2y8fVMWz6fMVhk2gr62p2SVmmadFTWAsIby5VL8", up:"the up 3", down:"the down 3"},
			{key:"4.sql", hash: "znwnKAtRJAJbaNYq23u1D3EZBZk2WcPmhbkyC1sE", up:"the up 4", down:"the down 4"}, // initial HEAD
			{key:"5.sql", hash: "K6v9P5UNQe5500BYLAs4wYHD5aKsAECOLnxVUOWS", up:"the up 5", down:"the down 5"}
		]);

		dbMigrations = createMigrations([
			{key:"1.sql", hash: "YmDVV6pPO1aPoLngJHgFeZqYEmrSTLwT6KAJQ6n0", up:"the up", down:"the down"},
			{key:"2.sql", hash: "P4BjPoJNSu5lbUwJLllNQ9LJCMeK53WDTA9OkbL9", up:"the up 2", down:"the down 2"}, // target HEAD
			{key:"3.sql", hash: "W2y8fVMWz6fMVhk2gr62p2SVmmadFTWAsIby5VL8", up:"the up 3", down:"the down 3"},
			{key:"4.sql", hash: "znwnKAtRJAJbaNYq23u1D3EZBZk2WcPmhbkyC1sE", up:"the up 4", down:"the down 4"} // initial HEAD
		]);

		mockRepo = new MockRepo({
			tableExists: true,
			migrations: dbMigrations
		});

		spyOn(mockRepo, "executeDownMigration").andCallThrough();
		mite = new Mite(config, mockRepo);

		mite.stepTo(diskMigrations, "2.sql").then(function(stepStatus) {
			status = stepStatus;
			done();
		}, done);
	});

	it("should succeed", function() {
		expect(status.updated).toBe(true);
	});

	it("should have correctly called executeDownMigration", function() {
		expect(mockRepo.executeDownMigration).toHaveBeenCalled();
		expect(mockRepo.executeDownMigration.callCount).toBe(2);
		expect(mockRepo.executeDownMigration.mostRecentCall.args[0]).toBe(diskMigrations[2]);
	});

	it("should have unexecuted migrations with the correct head", function() {
		return mite.status(diskMigrations).then(function(mStatus) {
			expect(mStatus.clean).toBe(false);

			// correct unexecuted migrations
			expect(mStatus.unexecutedMigrations.length).toBe(3);
			expect(mStatus.unexecutedMigrations[0]).toBe(diskMigrations[2].key);
			expect(mStatus.unexecutedMigrations[1]).toBe(diskMigrations[3].key);
			expect(mStatus.unexecutedMigrations[2]).toBe(diskMigrations[4].key);

			// correct executed migrations
			expect(mStatus.executedMigrations.length).toBe(2);

			// correct head
			expect(mStatus.executedMigrations[mStatus.executedMigrations.length - 1]).toBe(diskMigrations[1].key);
		});
	});
});