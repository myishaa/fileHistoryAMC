alter table division_year_allocations
add column if not exists active boolean not null default true;

create table if not exists tcec_committees (
  id uuid primary key default gen_random_uuid(),
  financial_year text not null,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists tcec_committees_year_name_key
on tcec_committees(financial_year, lower(name));

insert into tcec_committees (financial_year, name, sort_order)
select
  s.selected_year,
  value::text,
  ordinality - 1
from app_settings s
cross join lateral jsonb_array_elements_text(s.tcec_committees) with ordinality as committees(value, ordinality)
where value <> ''
on conflict do nothing;

create table if not exists file_year_activity (
  file_id uuid not null references files(id) on delete cascade,
  financial_year text not null,
  status text not null default 'active' check (status in ('active', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (file_id, financial_year)
);

insert into file_year_activity (file_id, financial_year, status)
select id, year, 'active'
from files
where year is not null and year <> ''
on conflict do nothing;

drop trigger if exists file_year_activity_set_updated_at on file_year_activity;
create trigger file_year_activity_set_updated_at
before update on file_year_activity
for each row execute function set_updated_at();

create index if not exists file_year_activity_year_idx
on file_year_activity(financial_year);
