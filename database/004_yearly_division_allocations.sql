create table if not exists division_year_allocations (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references divisions(id) on delete cascade,
  financial_year text not null,
  allocated_capital numeric(14, 2),
  allocated_revenue numeric(14, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (division_id, financial_year)
);

insert into division_year_allocations (
  division_id,
  financial_year,
  allocated_capital,
  allocated_revenue
)
select
  d.id,
  s.financial_year,
  d.allocated_capital,
  d.allocated_revenue
from divisions d
cross join app_settings s
where d.allocated_capital is not null
   or d.allocated_revenue is not null
on conflict (division_id, financial_year) do nothing;

drop trigger if exists division_year_allocations_set_updated_at on division_year_allocations;
create trigger division_year_allocations_set_updated_at
before update on division_year_allocations
for each row execute function set_updated_at();

create index if not exists division_year_allocations_year_idx
on division_year_allocations(financial_year);
