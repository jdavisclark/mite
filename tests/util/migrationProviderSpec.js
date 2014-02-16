var MigrationProvider = require("../../lib/migrationProvider"),
	path = require("path");

describe("provider", function () {
	var provider;

	beforeEach(function () {
		provider = new MigrationProvider(path.join(__dirname, "../fixtures/migrationProviderTestMigrations"));
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