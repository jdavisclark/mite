var mysql  = require("mysql")
  , uuid   = require("uuid")  
  , bogart = require("bogart")
  , q      = bogart.q;

/*
  Repository pattern should be adhered to throughout the site.
  All Repositories should return a promise with results.
  All methods designed to return multiple results should support limit and offset options.  
*/


exports.MiteRepository = function(connection){  
  function executeQuery(sql, parameters){
    var deferred = q.defer();
      try{
        connection.query(sql, parameters, function(err, rows, fields){
          if (err){ return deferred.reject(err)}
            deferred.resolve(rows);
        })

      }catch(err){
        console.log("FAIL" + err)
        return deferred.reject(err);
      }
    return deferred.promise;
  };

  return {
    trackerExist:function(db){
      return executeQuery("SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name = '_migration'", 
        [db]).then(function(result){
          return result.length > 0;
        })
    }
    ,createTracker:function(db){
      return executeQuery("CREATE  TABLE `_migration` ( \
          `key` VARCHAR(255) NOT NULL COMMENT 'Migration Key.  Matches the filename of the migrations' , \
          `migrateHash` CHAR(40) NULL COMMENT 'A hash value of the contents of the migration.' , \
          `dbHash` CHAR(40) NULL COMMENT 'A hash value of the dump of the current schema (sans data)' , \
          PRIMARY KEY (`key`) , \
          UNIQUE INDEX `key_UNIQUE` (`key` ASC) , \
          UNIQUE INDEX `migrateHash_UNIQUE` (`migrateHash` ASC) )");
    }
    ,init: function(db){
        //TODO get the username and the pasword and test.
        child_process.exec("mysqldump -u" + user + "-p" + password, function(err, stdout, stderr){
            console.log(stdout);
        })            
    }
    ,stepUp:function(){

    }
    ,stepDown:function(){

    }
    ,update: function(){

    }    
  }
}