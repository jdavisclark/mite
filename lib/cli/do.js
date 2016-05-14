var Mite = require("../mite"),
  reporter = require("./reporter"),
  MigrationProvider = require("../migrationProvider");

var cliUtil = require("./util"),
  printMigrationList = cliUtil.printMigrationList,
  connectionError = cliUtil.connectionError,
  handleUninitialized = cliUtil.handleUninitialized;

module.exports = DoCommand;

function DoCommand(fileName) {
  this.fileName= fileName;
}

DoCommand.prototype.preExecute = function(config) {
  var mite = new Mite(config);

  return mite.connect()
    .fail(connectionError)
    .then(mite._requireInit.bind(mite))
    .fail(handleUninitialized)
    .then(function(){
      return mite;
    });
};

DoCommand.prototype.execute = function(mite) {
  var opts = {
      submodule: mite.config.name
    },
    provider = new MigrationProvider(mite.config.migrationRoot, opts),
    executed = function(key) {
      reporter.success("do: %s...", key);
    };

  mite.on("migrationExecuted", executed);

  return mite.doMigration(provider.getMigrations(), this.fileName, opts).then(function(doStatus) {
    if(doStatus.error){
      reporter.err(doStatus.error);
    } else if (doStatus.updated) {
      reporter.success("complete");
    } else if (!doStatus.updated && doStatus.wasClean) {
      reporter.warn("no migration executed. status was clean");
    } else if (doStatus.dirtyMigrations) {
      printMigrationList("no migration executed. status is dirty. fix it.", "err", doStatus.dirtyMigrations, "err");
    }

    mite.removeListener("migrationExecuted", executed);
  });
};
