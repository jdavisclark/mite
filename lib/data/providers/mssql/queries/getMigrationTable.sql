SELECT top(1)
	tbls.TABLE_NAME as [table_name]
FROM
	INFORMATION_SCHEMA.TABLES tbls
WHERE
	tbls.TABLE_CATALOG = @schema
  and tbls.table_name = @table