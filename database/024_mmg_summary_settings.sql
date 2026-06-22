alter table app_settings
add column if not exists mmg_summary_fields jsonb not null default '[]'::jsonb;
