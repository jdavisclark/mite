select
	`key`,
	`hash`
from
	_migration
where
	`submodule` = :submodule
