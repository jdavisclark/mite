require("jasmine-node-promises")();

var Mite = require("../../lib/mite"),
	Migration = require("../../lib/migration"),
	config = require("../fixtures/mite.config.json"),
	MockRepo = require("../fixtures/mockMigrationRepository"),
	_ = require("underscore");


function createMigrations (bases) {
	return bases.map(function(data) {
		return new Migration(data);
	});
}


describe("status from clean + empty state", function () {
	var mite,
		status,
		migrations,
		repo;

	beforeEach(function () {
		status = null;
		migrations = [];
		repo = new MockRepo({
			migrations: [],
			tableExists: true
		});
		mite = new Mite(config, repo);

		spyOn(repo, "all").andCallThrough();

		return mite.status(migrations, {submodule: "someSubmodule"}).then(function (miteStatus) {
			status = miteStatus;
		});
	});

	it("should be clean", function () {
		expect(status.clean).toBe(true);
	});

	it("should have called repo.all", function() {
		expect(repo.all).toHaveBeenCalled();
	});

	it("should have called repo.all with the correct submodule", function() {
		expect(repo.all.mostRecentCall.args[0]).toBe("someSubmodule");
	});
});


describe("status from a clean root state with submodule migrations", function() {
	var migrations,
		repo,
		mite;

	beforeEach(function() {
		migrations = createMigrations([
			{key: "1.sql", hash: "AvmmE9MLGClDh7h8diKpDzhJLcZeCrLyKL4UnSX4", submodule:"sub1"},
			{key: "2.sql", hash: "AvmmE9MLGClDh7h8diKpDzhJLcZeCrLyKL4UnSX4", submodule:"sub1"},
			{key: "1.sql", hash: "D7KRA8xiBihH0fltjjhcMp0HfCsfdWEcZN9lCiSN", submodule: "."},
			{key: "2.sql", hash: "pmjsenAcmmXphtsiF4vG1kxGWKWZDzAn2Bjk70D1", submodule: "."}
		]);

		repo = new MockRepo({
			tableExists: true,
			migrations: migrations
		});

		mite = new Mite(config, repo);
	});

	it("root should be clean", function() {
		var disk = createMigrations([
			{key: "1.sql", hash: "D7KRA8xiBihH0fltjjhcMp0HfCsfdWEcZN9lCiSN", submodule: "."},
			{key: "2.sql", hash: "pmjsenAcmmXphtsiF4vG1kxGWKWZDzAn2Bjk70D1", submodule: "."}
		]);

		return mite.status(disk).then(function(status) {
			expect(status.clean).toBe(true);
		});
	});

	it("sub1 should be clean", function() {
		var disk = createMigrations([
			{key: "1.sql", hash: "AvmmE9MLGClDh7h8diKpDzhJLcZeCrLyKL4UnSX4", submodule:"sub1"},
			{key: "2.sql", hash: "AvmmE9MLGClDh7h8diKpDzhJLcZeCrLyKL4UnSX4", submodule:"sub1"}
		]);

		return mite.status(disk, {submodule:  "sub1"}).then(function(status) {
			expect(status.clean).toBe(true);
		});
	});
});


describe("status from unexecuted state with submodules", function () {
	var status,
		diskMigrations,
		migrations;

	beforeEach(function () {
		diskMigrations = createMigrations([{
			key: "1.sql",
			hash: "rnFiJsJRCsd0sqAsxKhaVnJ4hVhJpjtDZOsjFvob"
		}]);

		migrations = createMigrations([
			{key: "1", hash: "u3tcGMES62fWnpeQbUeTNPaKCQZOnhMFJQd3LSXq", submodule: "s1"},
			{key: "2", hash: "u3tcGMES62fWnpeQbUeTNPaKCQZOnhMFJQd3LSXq", submodule: "s2"}
		]);

		var mite = new Mite(config, new MockRepo({
			tableExists: true,
			migrations: migrations
		}));

		return mite.status(diskMigrations).then(function (s) {
			status = s;
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

describe("status from clean root state with unexecuted submodules", function () {
	var status,
		diskMigrations,
		migrations;

	beforeEach(function () {
		diskMigrations = createMigrations([
			{key: "1.sql", hash: "V2xBufRJgGlRCuwa0rgU7vdU2Boti5Eg1YAGwIvJ", submodule: "s1"},
			{key: "2.sql", hash: "nrRvZw8vvm5lelxeVwS9A8m7euiSOIUwVv31GfMv", submodule: "s1"}
		]);

		migrations = createMigrations([
			{key: "1.sql", hash: "u3tcGMES62fWnpeQbUeTNPaKCQZOnhMFJQd3LSXq"},
			{key: "2.sql", hash: "u3tcGMES62fWnpeQbUeTNPaKCQZOnhMFJQd3LSXq"},
			{key: "1.sql", hash: "V2xBufRJgGlRCuwa0rgU7vdU2Boti5Eg1YAGwIvJ", submodule: "s1"}
		]);

		var mite = new Mite(config, new MockRepo({
			tableExists: true,
			migrations: migrations
		}));

		return mite.status(diskMigrations, {submodule: "s1"}).then(function (s) {
			status = s;
		});
	});

	it("should not be clean", function () {
		expect(status.clean).toBe(false);
	});

	it("should have an unexecuted migration", function () {
		expect(status.unexecutedMigrations.length).toBe(1);
	});

	it("the unexecuted migration should have the correct key", function () {
		expect(status.unexecutedMigrations[0]).toBe("2.sql");
	});
});

describe("status from a clean root state with dirty submodules", function() {
	var status,
		dbMigrations = [
			{ key: "1.sql", hash: "nVsKv4YS0Se0SlXEGRN9jibI7sjzo2LG5dtHWEn3" },
			{ key: "2.sql", hash: "4g7282OdnvCB3jbOrAXzmiN7av33aeJ3xsGvtMz8" },
			{ key: "1.sql", hash: "R8jZIRve3H2zefffm7QQF58dHqX5aB56kzd9w9Vd", submodule: "s1"},
			{ key: "2.sql", hash: "UfMIZ6gqKcraD99dnWGm0jh8r6oB4rAUtzrPwCWF", submodule: "s1" }
		],
		diskMigrations = [
			{ key: "1.sql", hash: "changed...2zefffm7QQF58dHqX5aB56kzd9w9Vd", submodule: "s1"},
			{ key: "2.sql", hash: "UfMIZ6gqKcraD99dnWGm0jh8r6oB4rAUtzrPwCWF", submodule: "s1" }
		];

	beforeEach(function(done) {
		var mite = new Mite(config, new MockRepo({
			tableExists: true,
			migrations: dbMigrations
		}));

		mite.status(diskMigrations, {submodule: "s1"}).then(function(s) {
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