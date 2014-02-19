require("jasmine-node-promises")();

var Mite = require("../../lib/mite"),
	config = require("../fixtures/mite.config.json"),
	MockRepo = require("../fixtures/mockMigrationRepository");


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
			diskMigrations = [
				{key: "1.sql", up:"", down:""}
			];

		return mite.stepDown(diskMigrations).then(function(downStat) {
			expect(downStat.updated).toBe(false);
			expect(downStat.noExecutedMigrations).toBe(true);
		});
	});
});

describe("stepDown from dirty + unexecuted state", function() {
	var mite,
		diskMigrations,
		dbMigrations;

	beforeEach(function() {
		diskMigrations = [
			{key:"1.sql", hash:"leJXSSOoiAWErrXpYW09j0CwVKa2U3y5m23zO3Po"},
			{key: "2.sql", hash:"17PpAOUO17QbsxjNl0AHdB7Uea6v6ZpXQWRW8hFK"}
		];

		dbMigrations = [
			{key:"1.sql", hash:"thisHasChangedlx312CYSBRwAVVHyUdwTPK3XXg"}
		];

		mite = new Mite(config, new MockRepo({
			tableExists: true,
			migrations: dbMigrations
		}));
	});

	it("should fail due to dirty migrations", function() {
		return mite.stepDown(diskMigrations).then(function(status) {
			expect(status.updated).toBe(false);
			expect(status.dirtyMigrations).not.toBe(undefined);
		});
	});
});



describe("stepdown from a simple clean state", function() {
	var mite,
		mockRepo,
		diskMigrations,
		status;

	beforeEach(function(done) {
		diskMigrations = [
			{key: "1.sql", hash: "NIZxtDV8hHfJLXsCH0m2wZ7OGOb8ejcyCZIlDBjZ", up:"", down:""},
		];

		mockRepo = new MockRepo({
			tableExists: true,
			migrations: diskMigrations.map(function(m) {
				return {key: m.key, hash: m.hash};
			})
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