SELECT 
	table_name
FROM information_schema.tables
WHERE 
	table_schema = ?
    AND table_name = ?
LIMIT 1;