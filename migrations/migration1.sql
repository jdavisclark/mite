/* mite:up */
alter table Files add column mfield1 char(40) after userId;

/* mite:down */
alter table Files drop column mfield1;
