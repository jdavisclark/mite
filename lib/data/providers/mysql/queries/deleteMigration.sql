delete from
	_migration
where
	`key` = :key
	and `submodule` = :submodule;