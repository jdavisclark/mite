CREATE  TABLE `_migration` (
	`key` VARCHAR(255) NOT NULL COMMENT 'Migration Key.  Matches the filename of the migrations' ,
	`hash` CHAR(40) NOT NULL COMMENT 'A hash value of the contents of the migration.' ,
	`submodule` VARCHAR(255),
	PRIMARY KEY (`key`) ,
	UNIQUE INDEX `key_UNIQUE` (`key` ASC)
);