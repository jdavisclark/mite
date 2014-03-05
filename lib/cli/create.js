var path = require("path"),
	fs = require("fs"),
	reporter = require("./reporter"),
	q = require("q"),
	_ = require("underscore"),
	exec = require("child_process").exec;

module.exports = CreateCommand;

function CreateCommand(opts){
	this.options = _.extend({
		open: false
	}, opts);
}

CreateCommand.prototype.preExecute = function(config) {
	return config;
};

CreateCommand.prototype.execute = function(config) {
	var def = q.defer(),
		isoString = (new Date()).toISOString(),
		filename = (isoString.substring(0, isoString.lastIndexOf(".")) + "Z").replace(/\:/g, "-") + ".sql",
		filePath = path.join(config.migrationRoot, filename);

	try {
		fs.writeFileSync(filePath, require("../../templates/migration.sql"));
		reporter.success("migration created: " + filename);
	} catch (e) {
		reporter.err(e.toString());
	}

	if(this.options.open) {
		var open = config.open[config.platform];
		if(!open || !open.cmd) {
			reporter.warn("no 'open' command for platform '%s' defined", config.platform);
		} else {
			var cmd = [open.cmd].concat(open.args.map(function(arg) {
				if(arg === "{path}") {
					return filePath;
				} else return arg;
			}));

			exec(cmd.join(" "), {
				stdout: process.stdout,
				stdin: process.stdin
			});
		}
	}

	def.resolve();
	return def.promise;
};