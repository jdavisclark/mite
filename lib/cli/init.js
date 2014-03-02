var path = require("path"),
	reporter = require("./reporter"),
	fs = require("fs");


module.exports = InitCommand;

function InitCommand() {}

InitCommand.prototype.execute = function(mite, config) {
	return mite.init().then(
		function(initStatus) {
			if (initStatus.alreadyInitialized) {
				reporter.warn("_migration table already exists...skipping");
			} else if (initStatus.initialized) {
				reporter.success("_migration table created...");
			} else {
				reporter.err("fatal: could not create the _migration table");
			}

			// create migrations directory
			var migrationsPath = config.migrationRoot;

			if (fs.existsSync(migrationsPath)) {
				var stats = fs.lstatSync(migrationsPath);

				if (!stats.isDirectory()) {
					reporter.err("fatal: 'migrations' exists at the mite root, but it is not a directory (" + migrationsPath + ").");
					process.exit(1);
				}

				reporter.warn("'migrations' directory exists...skipping");
			} else {
				fs.mkdirSync(migrationsPath);
				reporter.success("'migrations' directory created...");
			}
		}
	);
};