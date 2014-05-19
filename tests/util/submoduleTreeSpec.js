var SubmoduleTree = require("../../lib/submoduleTree");

describe("submodules with no dependencies", function() {
	var subs = [
		{name: "a", dependencies: [] },
		{name: "b", dependencies: [] },
		{name: "c", dependencies: [] }
	];

	var tree = null;

	beforeEach(function() {
		tree = new SubmoduleTree(subs);
	});

	it("should execute in order", function() {
		expect(tree.upExecutionOrder()).toEqual(["a", "b", "c"]);
	});
});

describe("submodules with 1 deep dependencies", function() {
	var subs = [
		{name: "a", dependencies: ["c"] },
		{name: "b", dependencies: ["c"] },
		{name: "c", dependencies: [] }
	];

	var tree = null;

	beforeEach(function() {
		tree = new SubmoduleTree(subs);
	});

	it("should execute in correct order", function() {
		expect(tree.upExecutionOrder()).toEqual(["c", "a", "b"]);
	});
});

describe("submodules with 1 deep dependencies", function() {
	var subs = [
		{name: "a", dependencies: ["c"] },
		{name: "b", dependencies: ["a"] },
		{name: "c", dependencies: [] },

	];

	var tree = null;

	beforeEach(function() {
		tree = new SubmoduleTree(subs);
	});

	it("should execute in correct order", function() {
		expect(tree.upExecutionOrder()).toEqual(["c", "a", "b"]);
	});
});