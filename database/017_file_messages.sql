create table if not exists file_messages (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references files(id) on delete cascade,
  division_id uuid references divisions(id) on delete set null,
  section text not null,
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  created_by_user_id uuid references app_users(id) on delete set null,
  created_by_viewer_division_id uuid references divisions(id) on delete set null,
  created_by_name text not null,
  created_by_role text not null,
  resolved_by uuid references app_users(id) on delete set null,
  resolved_by_name text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists file_message_replies (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references file_messages(id) on delete cascade,
  body text not null,
  created_by_user_id uuid references app_users(id) on delete set null,
  created_by_name text not null,
  created_by_role text not null,
  created_at timestamptz not null default now()
);

drop trigger if exists file_messages_set_updated_at on file_messages;
create trigger file_messages_set_updated_at
before update on file_messages
for each row execute function set_updated_at();

create index if not exists file_messages_status_idx on file_messages(status);
create index if not exists file_messages_file_section_idx on file_messages(file_id, section);
create index if not exists file_messages_division_status_idx on file_messages(division_id, status);
create index if not exists file_message_replies_message_idx on file_message_replies(message_id, created_at);
