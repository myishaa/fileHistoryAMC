create table if not exists division_merges (
  id uuid primary key default gen_random_uuid(),
  financial_year text not null,
  target_division_id uuid not null references divisions(id) on delete restrict,
  effective_date date,
  notes text,
  move_active_files boolean not null default true,
  deactivate_source_divisions boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists division_merge_sources (
  merge_id uuid not null references division_merges(id) on delete cascade,
  source_division_id uuid not null references divisions(id) on delete restrict,
  primary key (merge_id, source_division_id)
);

create table if not exists file_division_history (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references files(id) on delete cascade,
  from_division_id uuid references divisions(id) on delete set null,
  to_division_id uuid references divisions(id) on delete set null,
  financial_year text not null,
  effective_date date,
  reason text,
  merge_id uuid references division_merges(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists division_merges_year_idx
on division_merges(financial_year);

create index if not exists division_merge_sources_source_idx
on division_merge_sources(source_division_id);

create index if not exists file_division_history_file_idx
on file_division_history(file_id);

create index if not exists file_division_history_year_idx
on file_division_history(financial_year);
