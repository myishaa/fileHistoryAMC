alter table app_settings
add column if not exists mmg_live_enabled boolean not null default false,
add column if not exists mmg_live_options jsonb not null default '[]'::jsonb;
