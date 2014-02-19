CREATE  TABLE `_migration` (
	`key` VARCHAR(255) NOT NULL COMMENT 'Migration Key.  Matches the filename of the migrations' ,
	`hash` CHAR(40) NOT NULL COMMENT 'A hash value of the contents of the migration.' ,
	#`dbHash` CHAR(40) NULL COMMENT 'A hash value of the dump of the current schema (sans data)' ,
	PRIMARY KEY (`key`) ,
	UNIQUE INDEX `key_UNIQUE` (`key` ASC)
);