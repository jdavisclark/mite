var Mite = require("../mite"),
	MigrationProvider = require("../migrationProvider"),
	fs = require("fs"),
	q = require("q"),
	_ = require("underscore"),
	path = require("path"),
	jsdiff = require("diff"),
	reporter = require("./reporter.js"),
	submoduleProviderFactory = require("../submoduleProviderFactory");

var cliUtil = require("./util"),
	connectionError = cliUtil.connectionError,
	handleUninitialized = cliUtil.handleUninitialized;

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
		config = mite.config;

	//Dump the current schema without data
	tasks.push(function() {
		return mite.dumpSchema(path.join(config.miteRoot, "current.sql"));
	});

	// drop schema if exists
	tasks.push(function() {
		return mite.dropDatabase("mite_tmp");
	});

	// create the new tmp schema
	tasks.push(function() {
		return mite.createDatabase("mite_tmp");
	});

	var auditConfig = JSON.parse(JSON.stringify(config));
	auditConfig.database = "mite_tmp";
	var miteAudit = new Mite(auditConfig);

	// init tmp database
	tasks.push(function() {
		return miteAudit.init();
	});

	// run submodule migrations
	tasks.push(function() {
		var subUps = q();

		// if we have submodules, we need to execute their migrations first
		if (auditConfig.submodules) {
			var subProvider = submoduleProviderFactory(auditConfig.submodules);
			var subs = subProvider.getSubmodules(auditConfig);

			subUps = subs.reduce(function(p, sub) {
				var subMigrationProvider = new MigrationProvider(sub.migrationRoot,{
					submodule: sub.name
				});

				var subMigrations = subMigrationProvider.getMigrations();

				return p.then(miteAudit.up.bind(miteAudit, subMigrations, {
					submodule: sub.name
				}));
			}, subUps);
		}

		return subUps;
	});

	var mainMigrationProvider = new MigrationProvider(config.migrationRoot);
	var mainMigrations = mainMigrationProvider.getMigrations();
	// run the main project up migrations
	tasks.push(miteAudit.up.bind(miteAudit, mainMigrations));

	// dump the schema
	tasks.push(miteAudit.dumpSchema.bind(miteAudit, path.join(config.miteRoot, "proper.sql")));

	// drop the tmp db
	tasks.push(miteAudit.dropDatabase.bind(miteAudit, "mite_tmp"));

	// run all the tasks serially
	var pTasks = tasks.reduce(function(p, task) {
		return p.then(task);
	}, q());

	//Do a diff
	return pTasks.then(function() {
		var def = q.defer(),
			properPath = path.join(config.miteRoot, "proper.sql"),
			currentPath = path.join(config.miteRoot, "current.sql"),
			properSql = fs.readFileSync(properPath, "utf8"),
			currentSql = fs.readFileSync(currentPath, "utf8"),
			jsDiffs = jsdiff.diffLines(properSql, currentSql);

		var anyDiffs = _.find(jsDiffs, function(part) {
			return part.added || part.removed;
		});

		if (!anyDiffs) {
			reporter.success("Successful audit, database and migrations are in sync.");
			def.resolve(true);
		} else {
			reporter.err("Database and migrations are out of sync. Someone has probably edited the database by hand.");
			jsDiffs.forEach(function(part) {
				var color = part.added ? "green" :
					part.removed ? "red" : "grey";
				process.stdout.write(part.value[color]);
			});

			def.resolve(false);
		}

		// fs.unlinkSync(properPath);
		// fs.unlinkSync(currentPath);

		return def.promise;
	});
};