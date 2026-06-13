create table if not exists user_table_field_presets (
  user_id uuid primary key references app_users(id) on delete cascade,
  presets jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
