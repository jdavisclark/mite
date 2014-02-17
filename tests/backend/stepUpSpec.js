var Mite = require("../../lib/mite"),
	config = require("../fixtures/mite.config.json"),
	MockRepo = require("../fixtures/mockMigrationRepository");

function failer(done) {
	return function (err) {
		this.fail(err);
		done();
	};
}

describe("stepup from uninitialized state", function () {
	var mite;

	beforeEach(function () {
		mite = new Mite(config, new MockRepo({
			tableExists: false
		}));
	});

	it("should fail due to initialization", function (done) {
		var self = this;

		mite.stepUp([]).then(function() {
			self.fail("should never resolve");
		}, function(status) {
			expect(status.initializationRequired).toBe(true);
			expect(status.fatal).toBe(true);
			done();
		});
	});
});

describe("stepup from dirty + unexecuted state", function() {
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

	it("should fail due to dirty migrations", function(done) {
		mite.stepUp(diskMigrations).then(function(status) {
			expect(status.updated).toBe(false);
			expect(status.dirtyMigrations).not.toBe(undefined);
			done();
		}, failer(done));
	});
});

describe("stepup from unexecuted state", function() {
	var mite,
		mockRepo,
		diskMigrations;

	beforeEach(function() {
		diskMigrations = [
			{key: "1.sql", hash: "NIZxtDV8hHfJLXsCH0m2wZ7OGOb8ejcyCZIlDBjZ"},
			{key: "2.sql", hash: "MHUd0IhqlWv2nr21o1HT3nuWeHEl5dwLywhQns4Z"}
		];

		mockRepo = new MockRepo({
			tableExists: true,
			migrations: []
		});

		mite = new Mite(config, mockRepo);
	});

	it("should succeed", function(done) {
		mite.stepUp(diskMigrations).then(function(status) {
			expect(status.updated).toBe(true);
			done();
		}, failer(done));
	});

	it("should have the correct number of tracked migrations", function(done) {
		mite.stepUp(diskMigrations).then(function() {
			mockRepo.all().then(function(allMigrations) {
				expect(allMigrations.length).toBe(1);
				done();
			}, failer(done));
		}, failer(done));
	});

	it("should call executeMigration the correct number of times", function(done) {
		spyOn(mockRepo, "executeMigration").andCallThrough();

		mite.stepUp(diskMigrations).then(function() {
			expect(mockRepo.executeMigration.callCount).toBe(1);
			done();
		}, failer(done));
	});
});