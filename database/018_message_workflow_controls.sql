alter table divisions
add column if not exists messages_enabled boolean not null default true;

alter table file_messages
add column if not exists viewed_at timestamptz,
add column if not exists deleted_at timestamptz;

create index if not exists file_messages_deleted_status_idx
on file_messages(deleted_at, status);
