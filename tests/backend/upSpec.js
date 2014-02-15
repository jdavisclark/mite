var Mite = require("../../lib/mite"),
	config = require("../fixtures/mite.config.json"),
	MockRepo = require("../fixtures/mockMigrationRepository"),
	fs = require("fs.extra"),
	rmrf = require("rimraf"),
	path = require("path");

var migration_home = path.join(__dirname, "../../", config.migration_home);


function failer(done) {
	return function (err) {
		this.fail(err);
		done();
	}
}

describe("up from uninitialized state", function () {
	var mite;

	beforeEach(function () {
		mite = new Mite(config, new MockRepo({
			migrations: [],
			tableExists: false
		}));
	});

	it("should fail", function (done) {
		var self = this;

		mite.up([]).then(function (upStatus) {
			self.fail("this should never resolve");
		}, function (failStatus) {
			expect(failStatus.fatal).toBe(true);
			expect(failStatus.initializationRequired).toBe(true);
			done();
		});
	});
});


describe("up from clean state", function () {
	var mite,
		migrations = [{
			key: "1.sql",
			hash: "lrzmBZxrYf8cKZiBa3UrLj4NyCbZLxxX4uhWWbUc"
		}];

	beforeEach(function () {
		mite = new Mite(config, new MockRepo({
			tableExists: true,
			migrations: migrations
		}))
	});

	it("should do nothing", function (done) {
		mite.up(migrations).then(function (upStatus) {
			expect(upStatus.updated).toBe(false);
			expect(upStatus.wasClean).toBe(true);
			done();
		}, failer(done));
	});
});

describe("up from dirty state", function (done) {
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
		})
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