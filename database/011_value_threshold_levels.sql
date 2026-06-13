create table if not exists value_threshold_levels (
  id uuid primary key default gen_random_uuid(),
  financial_year text not null,
  level_number integer not null check (level_number > 0),
  label text not null,
  min_value numeric(14, 2),
  max_value numeric(14, 2),
  applies_to text not null default 'both' check (applies_to in ('capital', 'revenue', 'both')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (min_value is null or max_value is null or min_value <= max_value)
);

create unique index if not exists value_threshold_levels_year_level_key
on value_threshold_levels(financial_year, level_number);

create index if not exists value_threshold_levels_year_idx
on value_threshold_levels(financial_year);

drop trigger if exists value_threshold_levels_set_updated_at on value_threshold_levels;
create trigger value_threshold_levels_set_updated_at
before update on value_threshold_levels
for each row execute function set_updated_at();
