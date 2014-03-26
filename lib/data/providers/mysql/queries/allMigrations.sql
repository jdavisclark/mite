select
	*
from
	_migration
where
	(:submodule is null and submodule is null)
	or (submodule = :submodule);
