SELECT
	table_name
FROM information_schema.tables
WHERE
	table_schema = :schema
    AND table_name = :table
LIMIT 1;