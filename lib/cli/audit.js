var Mite = require("../mite"),
	migrationProvider = require("../migrationProvider"),
	spawn = require("child_process").spawn,
	fs = require("fs"),
	q = require("q"),
	_ = require("underscore"),
	path = require("path")
	jsdiff = require("diff")
	reporter = require("./reporter.js");

var cliUtil = require("./util"),
	connectionError = cliUtil.connectionError;

module.exports = AuditCommand;

function AuditCommand() {}

AuditCommand.prototype.preExecute = function(config) {
	var mite = new Mite(config);

	return mite.connect()
			.then(function() {
				return mite;
			})
			.fail(connectionError);
};

AuditCommand.prototype.execute = function(mite) {
	var tasks = [],
		config = mite.config,
		provider = new migrationProvider(config.migrationRoot);

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
			currentPath = path.join(config.miteRoot, "current.sql"),
			properSql = fs.readFileSync(properPath, 'utf8'),
			currentSql = fs.readFileSync(currentPath, 'utf8'),
			jsDiffs = jsdiff.diffLines(properSql, currentSql);

		var anyDiffs = _.find(jsDiffs, function(part) { return part.added || part.removed });

		if(!anyDiffs) {
			console.log("Successful audit, database and migrations are in sync.".success);
			def.resolve(true);
		} else {
			jsDiffs.forEach(function(part) {
				var color = part.added ? 'green' :
					part.removed ? 'red' : 'grey';
				process.stdout.write(part.value[color]);
			});
			console.log("Database and migrations are out of sync. Someone has probably edited the database by hand.".err);
			def.resolve(false);
		}

		return def.promise;
	}, function(err) {
		console.log(err.err)
	});
};
