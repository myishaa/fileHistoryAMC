alter table user_table_field_presets
  add column if not exists owner_key text;

update user_table_field_presets
set owner_key = user_id::text
where owner_key is null;

alter table user_table_field_presets
  alter column owner_key set not null;

alter table user_table_field_presets
  drop constraint if exists user_table_field_presets_pkey;

alter table user_table_field_presets
  add constraint user_table_field_presets_pkey primary key (owner_key);

alter table user_table_field_presets
  alter column user_id drop not null;
