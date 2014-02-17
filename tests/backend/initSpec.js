var Mite = require("../../lib/mite"),
	config = require("../fixtures/mite.config.json"),
	MockRepo = require("../fixtures/mockMigrationRepository");


function failer(done) {
	return function (err) {
		this.fail(err);
		done();
	};
}

describe("clean init", function () {
	var mite;

	beforeEach(function () {
		var mockRepo = new MockRepo({
			migrations: undefined,
			tableExists: false
		});

		mite = new Mite(config, mockRepo);
	});

	it("should initialize", function (done) {
		mite.init()
			.then(function (createdTable) {
				expect(createdTable.initialized).toBe(true);
				done();
			}, failer(done));
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

	it("should not initialize", function (done) {
		mite.init().then(
			function (created) {
				expect(created.initialized).toEqual(false);
				expect(created.alreadyInitialized).toEqual(true);
				done();
			},
			failer(done)
		);
	});
});