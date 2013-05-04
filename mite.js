var program = require('commander')
  ,moment   = require('moment')
  ,path     = require('path')
  ,fs       = require('fs')
  ,sha1     = require('sha1')
  ,mysql    = require('mysql')
  ,q        = require('bogart').q
  ,MiteRepository = require('./lib/miteRepo').MiteRepository
  ,trackerFactory = require('./lib/trackerFactory').TrackerFactory

var connection;
//Read all the migrations from the file system
program
  .version('0.0.1')
  .option('-c, --create', 'create a migration file')
  .option('-s, status', 'status of mite migrations')
  .option('-i, init', 'init the _migrations table and the initial migration')
  .parse(process.argv);
//mite status 

var comments = "/* up */\n\n/* down */\n\n";
var data = fs.readFileSync("mite.config", "utf-8");
var promises = [];

var settings = JSON.parse(data);
connection = mysql.createConnection(settings.connectionString);
var miteRepo = MiteRepository(connection);
if (program.create){
  var now = moment.utc().format();
  now = now.substring(0,now.indexOf("+")).replace(/:/g, "-");
  var filename = now + "Z.sql";
  return fs.appendFile(filename, comments, function(err){
    if (err)
    {
      console.log(filename + " written successfully");
    }
  })
}
if (program.status){    
  promises.push(miteRepo.trackerExist().then(function(hasTable){
     if (hasTable){
        //get a tracker which will read all the migrations and all of the data.

     }else{
        console.log("_migrations table not found");
     }
  }));
}

if (program.init){

  promises.push(trackerFactory.parseMigration(path.join(__dirname, "1.sql")).then(function(migration){
    console.log(migration);
  },function(err){
    console.log(err);
  }))
  // promises.push(miteRepo.createTracker().then(function(){
  //   // trackerFactory.readDir(__dirname).then(function(migrations){
  //   //    console.log("IMG HERE")
  //   //    console.log(migrations[0].up);
  //   // })
  // }, function(err){
  //     console.log(err);
  // }))
}


q.all(promises).then(function(){
  console.log("END")
}, function(err){
  console.err(err);
})
