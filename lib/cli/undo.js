var Mite = require("../mite"),
  reporter = require("./reporter"),
  MigrationProvider = require("../migrationProvider");

var cliUtil = require("./util"),
  printMigrationList = cliUtil.printMigrationList,
  connectionError = cliUtil.connectionError,
  handleUninitialized = cliUtil.handleUninitialized;

module.exports = UnDoCommand;

function UnDoCommand(fileName) {
  this.fileName= fileName;
}

UnDoCommand.prototype.preExecute = function(config) {
  var mite = new Mite(config);

  return mite.connect()
    .fail(connectionError)
    .then(mite._requireInit.bind(mite))
    .fail(handleUninitialized)
    .then(function(){
      return mite;
    });
};

UnDoCommand.prototype.execute = function(mite) {
  var opts = {
      submodule: mite.config.name
    },
    provider = new MigrationProvider(mite.config.migrationRoot, opts),
    executed = function(key) {
      reporter.success("undo: %s...", key);
    };

  mite.on("migrationExecuted", executed);

  return mite.undoMigration(provider.getMigrations(), this.fileName, opts).then(function(undoStatus) {
    if(undoStatus.error){
      reporter.err(undoStatus.error);
    } else if (undoStatus.updated) {
      reporter.success("complete");
    } else if (!undoStatus.updated && undoStatus.wasClean) {
      reporter.warn("no migration executed. status was clean");
    } else if (undoStatus.dirtyMigrations) {
      printMigrationList("no migration executed. status is dirty. fix it.", "err", undoStatus.dirtyMigrations, "err");
    }

    mite.removeListener("migrationExecuted", executed);
  });
};
