alter table app_settings
add column if not exists year_selection_locked boolean not null default false;
