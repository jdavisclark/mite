var DependencyGraph = require("dependency-graph").DepGraph;

module.exports = SubmoduleTree;

function SubmoduleTree(submodules) {
	var self = this;
	this.graph = new DependencyGraph();

	submodules.forEach(function(sub) {
		self.graph.addNode(sub.name);
	});

	submodules.forEach(function(sub) {
		sub.dependencies.forEach(self.graph.addDependency.bind(self.graph, sub.name));
	});
}

SubmoduleTree.prototype.upExecutionOrder = function() {
	return this.graph.overallOrder();
};

SubmoduleTree.prototype.downExecutionOrder = function() {
	return this.graph.overallOrder().reverse();
};