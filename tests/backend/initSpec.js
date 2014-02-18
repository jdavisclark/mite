require("jasmine-node-promises")();

var Mite = require("../../lib/mite"),
	config = require("../fixtures/mite.config.json"),
	MockRepo = require("../fixtures/mockMigrationRepository");

describe("clean init", function () {
	var mite;

	beforeEach(function () {
		var mockRepo = new MockRepo({
			migrations: undefined,
			tableExists: false
		});

		mite = new Mite(config, mockRepo);
	});

	it("should initialize", function () {
		return mite.init().then(function (createdTable) {
			expect(createdTable.initialized).toBe(true);
		});
	});
});

describe("init on existing environment", function () {
	var mite;

	beforeEach(function () {
		var mockRepo = new MockRepo({
			migrations: [],
			tableExists: true
		});
		mite = new Mite(config, mockRepo);
	});

	it("should not initialize", function () {
		return mite.init().then(function (created) {
			expect(created.initialized).toEqual(false);
			expect(created.alreadyInitialized).toEqual(true);
		});
	});
});