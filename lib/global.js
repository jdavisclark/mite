#!/usr/bin/env node

var child_process = require("child_process");
var path = require("path");
var fs = require("fs");

npmRoot(process.cwd(), function(err, p) {
	var globalCli = path.join(__dirname, "cli", "index.js");
	var executable = null;

	if (p) { // somewhere inside an npm root
		var localCli = path.join(p, "node_modules", "mite/lib/cli/index.js");
		executable = fs.existsSync(localCli) ? localCli : globalCli;
	} else {
		executable = globalCli;
	}

	var miteProc = child_process.spawn(executable, process.argv.slice(2));
	miteProc.stdout.pipe(process.stdout);
	miteProc.stderr.pipe(process.stderr);

	miteProc.on("close", process.exit);
});

// stolen from npm/lib/utils/find-prefix.js + modified
function npmRoot(p, cb, original) {
	if (p === "/" || (process.platform === "win32" && p.match(/^[a-zA-Z]:(\\|\/)?$/))) {
		return cb(null, original);
	}

	fs.readdir(p, function(er, files) {
		// walked up too high or something.
		if (er) return cb(null, original);

		if (files.indexOf("node_modules") !== -1) {
			return cb(null, p);
		}

		var d = path.dirname(p);
		if (d === p) return cb(null, original);

		return npmRoot(d, cb, original);
	});
}