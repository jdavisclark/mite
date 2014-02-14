var MigrationHasher = require("../../lib/migrationHasher"),
	path = require("path");

describe("hasher", function() {
	it("should get 1 migration", function() {
		var hasher = new MigrationHasher(path.join(__dirname, "../fixtures/statusSpecMigrations"));
		var migrations = hasher.getMigrations();

		expect(migrations).not.toBe(null);
		expect(migrations.length).toBe(1);

		migrations.forEach(function(m) {
			expect(m.hash.length).toBe(40);
		});
	});
});