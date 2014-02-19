require("jasmine-node-promises")();

var MigrationProvider = require("../../lib/migrationProvider"),
	path = require("path"),
	fs = require("fs");

describe("provider (up only migrations)", function () {
	var provider;

	beforeEach(function () {
		provider = new MigrationProvider(path.join(__dirname, "../fixtures/migrationProviderTestMigrations/simple"));
	});

	it("should get migrations with an up", function() {
		var migrations = provider.getMigrations();
		migrations.forEach(function(m) {
			expect(m.up.length).toBeGreaterThan(0);
			expect(m.down).toBe(undefined);
		});
	});

	it("should get 1 migration", function () {
		var migrations = provider.getMigrations();

		expect(migrations).not.toBe(null);

		// sha1 is always 40 characters
		migrations.forEach(function (m) {
			expect(m.hash.length).toBe(40);
		});
	});

	it("should get 2 files with start param", function () {
		var migrations = provider.getMigrations("2.sql");
		expect(migrations[0].key).toBe("2.sql");
	});

	it("should get 1 file with start && end param", function() {
		var migrations = provider.getMigrations("2.sql", "3.sql");
		expect(migrations.length).toBe(2);
		expect(migrations[0].key).toBe("2.sql");
		expect(migrations[1].key).toBe("3.sql");
	});
});

describe("provider (up & down)", function() {
	var provider,
		migrations;

	beforeEach(function() {
		provider = new MigrationProvider(path.join(__dirname, "../fixtures/migrationProviderTestMigrations/complete"));
		migrations = provider.getMigrations();
	});

	it("should have an up & down for each migration", function() {
		migrations.forEach(function(m) {
			expect(typeof m.up).toBe("string");
			expect(typeof m.down).toBe("string");
		});
	});
});

describe("migration root with non-migrations", function() {
	var provider,
		migrations;

	beforeEach(function() {
		provider = new MigrationProvider(path.join(__dirname, "../fixtures/migrationProviderTestMigrations/withMiscFiles"));
		migrations = provider.getMigrations();
	});

	it("should have the correct number of migrations", function() {
		expect(migrations.length).toBe(2);
	});

	it("should only have sql migrations", function() {
		migrations.forEach(function(m) {
			var ext = path.extname(m.key);
			expect(ext).toBe(provider.opts.migrationExtension);
		});
	});
});

