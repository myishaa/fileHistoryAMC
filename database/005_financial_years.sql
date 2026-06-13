create table if not exists financial_years (
  label text primary key,
  created_at timestamptz not null default now()
);

insert into financial_years (label)
select financial_year from app_settings where financial_year is not null and financial_year <> ''
on conflict (label) do nothing;

insert into financial_years (label)
select selected_year from app_settings where selected_year is not null and selected_year <> ''
on conflict (label) do nothing;

insert into financial_years (label)
select distinct year from files where year is not null and year <> ''
on conflict (label) do nothing;

insert into financial_years (label)
select distinct financial_year
from division_year_allocations
where financial_year is not null and financial_year <> ''
on conflict (label) do nothing;
