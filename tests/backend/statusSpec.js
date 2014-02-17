var Mite = require("../../lib/mite"),
	config = require("../fixtures/mite.config.json"),
	MockRepo = require("../fixtures/mockMigrationRepository");

function failer(done) {
	return function (err) {
		this.fail(err);
		done();
	};
}

describe("status from uninitialized state", function() {
	var mite;

	beforeEach(function() {
		mite = new Mite(config, new MockRepo({
			migrations: [],
			tableExists: false
		}));
	});

	it("should fail", function(done) {
		var self = this;

		mite.status([]).then(function() {
			self.fail("this should never resolve");
		}, function(failStatus) {
			expect(failStatus.fatal).toBe(true);
			expect(failStatus.initializationRequired).toBe(true);
			done();
		});
	});
});

describe("status from clean + empty state", function () {
	var mite;

	beforeEach(function () {
		mite = new Mite(config, new MockRepo({
			migrations: [],
			tableExists: true
		}));
	});

	it("should be clean", function (done) {
		var migrations = [];

		mite.status(migrations).then(function (status) {
			expect(status.clean).toBe(true);
			done();
		}, failer(done).bind(this));
	});
});


describe("status from a clean state with migrations", function() {
	var status,
		migrations = [
			{key: "1.sql", hash: "AvmmE9MLGClDh7h8diKpDzhJLcZeCrLyKL4UnSX4", up: "stuff goes here"}
		],
		repo = new MockRepo({
			tableExists: true,
			migrations: migrations
		}),
		mite = new Mite(config, repo);

	beforeEach(function(done) {
		mite.status(migrations).then(function(miteStatus) {
			status = miteStatus;
			done();
		});
	});

	it("should be clean", function() {
		expect(status.clean).toBe(true);
	});
});


describe("status from unexecuted state", function () {
	var status,
		migrations = [{
			key: "1.sql",
			hash: "rnFiJsJRCsd0sqAsxKhaVnJ4hVhJpjtDZOsjFvob"
		}];

	beforeEach(function (done) {
		var mite = new Mite(config, new MockRepo({
			tableExists: true
		}));

		mite.status(migrations).then(function (s) {
			status = s;
			done();
		});
	});

	it("should not be clean", function () {
		expect(status.clean).toBe(false);
	});

	it("should have an unexecuted migration", function () {
		expect(status.unexecutedMigrations.length).toBe(1);
	});

	it("the unexecuted migration should have the correct key", function () {
		expect(status.unexecutedMigrations[0]).toBe("1.sql");
	});
});

describe("status from a dirty state", function() {
	var status,
		dbMigrations = [
			{ key: "1.sql", hash: "nVsKv4YS0Se0SlXEGRN9jibI7sjzo2LG5dtHWEn3" },
			{ key: "2.sql", hash: "4g7282OdnvCB3jbOrAXzmiN7av33aeJ3xsGvtMz8" }
		],
		diskMigrations = [
			{ key: "1.sql", hash: "this has changed........................" },
			{ key: "2.sql", hash: "4g7282OdnvCB3jbOrAXzmiN7av33aeJ3xsGvtMz8" }
		];

	beforeEach(function(done) {
		var mite = new Mite(config, new MockRepo({
			tableExists: true,
			migrations: dbMigrations
		}));

		mite.status(diskMigrations).then(function(s) {
			status = s;
			done();
		});
	});

	it("should be dirty", function() {
		expect(status.clean).toBe(false);
	});

	it("should have 1 dirty migration", function() {
		expect(status.dirtyMigrations.length).toBe(1);
	});

	it("should have the correct dirty migration name", function() {
		expect(status.dirtyMigrations[0]).toBe("1.sql");
	});

	it("should have no unexecuted migrations", function() {
		expect(status.unexecutedMigration).toBe(undefined);
	});
});









