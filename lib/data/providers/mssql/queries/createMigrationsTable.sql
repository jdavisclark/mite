CREATE  TABLE [_migration] (
	[key] VARCHAR(255) NOT NULL ,
	[hash] CHAR(40) NOT NULL ,
	[submodule] varchar(255) DEFAULT '.',

	PRIMARY KEY ([key], [submodule])
)
