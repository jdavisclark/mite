/* mite:up */
alter table Files add column mfield3 char(40) after userId;

/* mite:down */
alter table Files drop column mfield3;
