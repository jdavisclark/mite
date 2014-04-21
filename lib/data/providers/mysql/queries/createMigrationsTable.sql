CREATE  TABLE `_migration` (
	`key` VARCHAR(255) NOT NULL COMMENT 'Migration Key.  Matches the filename of the migrations' ,
	`hash` CHAR(40) NOT NULL COMMENT 'A hash value of tworkhe contents of the migration.' ,
	`submodule` varchar(255) DEFAULT '.' COMMENT 'name of the submodule the migration originated from. null for root',

	PRIMARY KEY (`key`, `submodule`),
	UNIQUE INDEX `key_UNIQUE` (`key` ASC, `submodule` ASC)
);