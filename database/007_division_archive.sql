alter table divisions
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references app_users(id) on delete set null,
  add column if not exists archive_reason text;

create index if not exists divisions_archived_at_idx on divisions(archived_at);
