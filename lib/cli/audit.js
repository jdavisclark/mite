var Mite = require("../mite"),
	migrationProvider = require("../migrationProvider"),
	spawn = require("child_process").spawn,
	fs = require("fs"),
	q = require("q"),
	_ = require("underscore"),
	path = require("path");

module.exports = AuditCommand;

function AuditCommand() {}

AuditCommand.prototype.audit = function(config) {
	var tasks = [],
		provider = new migrationProvider(config.migrationRoot),
		mite = new Mite(config);

	//Dump the current schema without data
	tasks.push(mite.dumpSchema(path.join(config.miteRoot, "current.sql")));

	//Drop mite_tmp.  Up from scratch in mite_tmp
	//Dump mite_tmp
	var tmpConfig = _.extend({}, config);
	tmpConfig.database = undefined;
	mite = new Mite(tmpConfig);


	// run migrations on an empty database, dump the schema
	tasks.push(
		mite.createSchema("mite_tmp").then(function() {
			tmpConfig.database = "mite_tmp";
			mite = new Mite(tmpConfig);
			return mite.init().then(function() {
				return mite.up(provider.getMigrations()).then(function() {
					return mite.dumpSchema(path.join(config.miteRoot, "proper.sql")).then(function() {
						return mite.dropSchema("mite_tmp");
					});
				});
			});
		})
	);

	//Do a diff
	return q.all(tasks).then(function() {
		var def = q.defer(),
			properPath = path.join(config.miteRoot, "proper.sql"),
			currentPath = path.join(config.miteRoot, "current.sql");

		var args = config.diff.args.map(function(arg) {
			if(arg === "{current}") {
				return currentPath;
			} else if(arg === "{proper}") {
				return properPath;
			} else return arg;
		});

		var diff = spawn(config.diff.cmd, args),
			diffOut = [];

		diff.stdout.on("data", function(data) {
			diffOut.push(data.toString());
		});

		diff.on("exit", function(code) {
			fs.unlink(properPath);
			fs.unlink(currentPath);

			if(code === 0) {
				console.log("Successful audit, database and migrations are in sync.".success);
				console.log(diffOut.join(""));
				def.resolve(true);
			} else {
				console.log("Database and migrations are out of sync. Someone has probably edited the database by hand.".err);
				console.log(diffOut.join(""));
				def.resolve(false);
			}
		});

		return def.promise;
	}, function(err) {
		console.log(err.err)
	});
};