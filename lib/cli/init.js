var Mite = require("../mite"),
	reporter = require("./reporter"),
	readline = require("readline"),
	q = require("q"),
	_ = require("underscore"),
	fs = require("fs");

var cliUtil = require("./util"),
	connectionError = cliUtil.connectionError;

module.exports = InitCommand;

function InitCommand(opts) {
	this.rl = readline.createInterface({
		input: opts.rlInput || process.stdin,
		output: opts.rlOutput || process.stdout
	});
}

InitCommand.prototype.preExecute = function(config) {
	var self = this;
	var configDefer = q();
	if (!config.configExists) {
		var texts = [
			'Enter host name (leave blank for [' + config.host + ']): ',
			'Enter port (leave blank for [3306]): ',
			'Enter user name: ',
			'Enter user password: ',
			'Enter db dialect: ',
			'Enter database name: '
		];
		var genConfig = {};
		configDefer = cliUtil.pQuestion(self.rl, texts[0]).then(function (resp) {
			genConfig.host = resp || config.host;
			return cliUtil.pQuestion(self.rl, texts[1]);
		}).then(function (resp) {
			genConfig.port = resp || 3306;
			return cliUtil.pQuestion(self.rl, texts[2]);
		}).then(function (resp) {
			genConfig.user = resp;
			return cliUtil.pQuestion(self.rl, texts[3]);
		}).then(function (resp) {
			genConfig.password = resp;
			return cliUtil.pQuestion(self.rl, texts[4]);
		}).then(function (resp) {
			genConfig.dialect = resp;
			return cliUtil.pQuestion(self.rl, texts[5]);
		}).then(function (resp) {
			genConfig.database = resp;

			fs.writeFileSync('./mite.config', JSON.stringify(genConfig, null, '  '));
			config = _.extend(config, genConfig);
		});
	}

	return configDefer.then(function () {
		var mite = new Mite(config);

		return mite.connect()
				.fail(connectionError)
				.then(function() {

					
					
					return mite;
				});
	});
};

InitCommand.prototype.execute = function(mite) {
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
			var migrationsPath = mite.config.migrationRoot;

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