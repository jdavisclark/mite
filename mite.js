var program = require('commander')
  ,moment   = require('moment')
  ,fs       = require('fs')
  ,sha1     = require('sha1')
  ,mysql    = require('mysql')
  ,q        = require('bogart').q
  ,MiteRepository = require('./lib/miteRepo').MiteRepository

var connection;
//Read all the migrations from the file system
program
  .version('0.0.1')
  .option('-c, --create', 'create a migration file')
  .option('-s, status', 'status of mite migrations')
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
  promises.push(miteRepo.trackerExist().then(function(result){
     console.log("HI");
     result ? console.log("TRACKER EXISTS") : console.log("TRACKER DOESN't EXISTS");
     return result;
  }));
}

q.all(promises).then(function(){
  console.log("success")
}, function(err){
  console.log(err);
})
