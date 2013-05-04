var bogart = require('bogart')
    ,q     = bogart.q
    ,fs    = require('fs')
    ,sha   = require('sha1')

exports.TrackerFactory = {

	readDir:function(migrationDirectory){
	  var readdir = bogart.promisify(fs.readdir);
	  
	  var migrations = [];
	  return readdir(migrationDirectory).then(function(files){
	  	files.map(function(file){
	  		if (file.indexOf(".sql") > 0){
	  			migrations.push(parseMigration(file));	
	  		}	  		
	  	})
	  	return migrations;
	  })
	}
	,parseMigration: function(filename){
		var readFile = bogart.promisify(fs.readFile);
		return readFile(filename, "utf-8").then(function(data){
			var hash = sha(data);
			var contents = data.split("/* down */");
			var up = contents[0].replace("/* up */", "").trim();
			if (contents.length > 1){
				var down = contents[1].trim();
			}
			return {up:up, down:down, hash: hash};
		})
	}
}