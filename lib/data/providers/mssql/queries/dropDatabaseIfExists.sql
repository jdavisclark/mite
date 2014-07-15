if exists (select * from information_schema.schemata where catalog_name = @schema)
begin
  drop database :schema
end