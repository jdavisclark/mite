require("jasmine-node-promises")();

var ContextProvider = require("../../lib/submoduleProviders/contextProvider"),
	path = require("path");

describe("mite root with no submodules", function() {
	var provider,
		submodules;

	beforeEach(function() {
		provider = new ContextProvider();
		submodules = provider.getSubmodules({
			miteRoot: path.resolve(__dirname, "../fixtures/contextSubmoduleProviderFixtures", "root_noSubmodules"),
			migrationFolderName: "migrations",
			CONFIG_FILENAMES: [".mite", "mite.config"]
		});
	});

	it("should have no submodules", function() {
		expect(submodules.length).toBe(0);
	});
});

describe("mite root with multiple non-nested submodules", function() {
	var provider,
		submodules;

	beforeEach(function() {
		provider = new ContextProvider();
		submodules = provider.getSubmodules({
			miteRoot: path.resolve(__dirname, "../fixtures/contextSubmoduleProviderFixtures", "root_nonNested"),
			migrationFolderName: "migrations",
			CONFIG_FILENAMES: [".mite", "mite.config"]
		});
	});

	it("should have correct submodules", function() {
		expect(submodules.length).toBe(2);

		expect(submodules.some(function(sub) {
			return sub.name === "sub1";
		})).toBe(true);

		expect(submodules.some(function(sub) {
			return sub.name === "sub2";
		})).toBe(true);
	});
});

describe("mite root with ignored submodules", function() {
	var provider,
		submodules;

	beforeEach(function() {
		provider = new ContextProvider();
		submodules = provider.getSubmodules({
			miteRoot: path.resolve(__dirname, "../fixtures/contextSubmoduleProviderFixtures", "ignorePaths"),
			migrationFolderName: "migrations",
			CONFIG_FILENAMES: [".mite", "mite.config"],
			ignorePaths: ["**/"]
		});
	});

	it("should have correct submodules", function() {
		expect(submodules.length).toBe(0);
	});
});