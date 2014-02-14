var Mite = require("../../lib/mite"),
	config = require("../fixtures/mite.config.json"),
	MockRepo = require("../fixtures/mockMigrationRepository");


function failer(done) {
	return function (err) {
		this.fail(err);
		done();
	}
}

debugger;
describe("clean init", function () {
	var mite;

	beforeEach(function () {
		var mockRepo = new MockRepo({
			migrations: undefined,
			tableExists: false
		});

		mite = new Mite(config, mockRepo);
	});

	it("should create the migrations table", function (done) {
		var self = this;

		mite.init()
			.then(function (createdTable) {
				expect(createdTable).toBe(true);
				done();
			}, failer(done))
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

	it("should create the migrations table", function (done) {
		var self = this;

		mite.init().then(
			function (created) {
				expect(created).toEqual(false);
				done();
			},
			failer(done)
		);
	});
});