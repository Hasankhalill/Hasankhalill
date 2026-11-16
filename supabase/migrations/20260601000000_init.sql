-- Jazzar fleet.
-- A rental occupies [pickup_date, return_date). The return day is free.
-- A same-day rental (pickup = return) occupies that one calendar day.
-- Only the signed-in owner can read or write their rows.

set search_path = public, extensions;

create extension if not exists btree_gist with schema extensions;

create or replace function public.rental_occupied(pickup date, ret date)
returns daterange
language sql
immutable
set search_path = public
as $$
  select case
    when pickup < ret then daterange(pickup, ret, '[)')
    when pickup = ret then daterange(pickup, pickup + 1, '[)')
    else null
  end;
$$;

create or replace function public.assign_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.owner_id := auth.uid();
    end if;
    if new.owner_id is null then
      raise exception 'owner_id is required';
    end if;
  elsif tg_op = 'UPDATE' then
    new.owner_id := old.owner_id;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create or replace function public.enforce_rental_car()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  car_owner uuid;
begin
  select owner_id into car_owner from public.cars where id = new.car_id;
  if car_owner is distinct from new.owner_id then
    raise exception 'car not found for this owner';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_payment_rental()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  rental_owner uuid;
begin
  select owner_id into rental_owner from public.rentals where id = new.rental_id;
  if rental_owner is distinct from new.owner_id then
    raise exception 'rental not found for this owner';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_expense_car()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  car_owner uuid;
begin
  select owner_id into car_owner from public.cars where id = new.car_id;
  if car_owner is distinct from new.owner_id then
    raise exception 'car not found for this owner';
  end if;
  return new;
end;
$$;

create table public.cars (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  make text not null check (char_length(btrim(make)) > 0),
  model text not null check (char_length(btrim(model)) > 0),
  year integer not null check (year between 1980 and 2035),
  license_plate text not null check (char_length(btrim(license_plate)) > 0),
  default_daily_rate numeric(12, 2) not null check (default_daily_rate > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, license_plate)
);

create table public.rentals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  car_id uuid not null references public.cars (id) on delete restrict,
  pickup_date date not null,
  return_date date not null,
  daily_rate numeric(12, 2) not null check (daily_rate > 0),
  customer_name text,
  customer_phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  occupied daterange generated always as (public.rental_occupied(pickup_date, return_date)) stored not null,
  constraint rentals_return_not_before_pickup check (return_date >= pickup_date),
  constraint rentals_no_overlap exclude using gist (car_id with =, occupied with &&)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  rental_id uuid not null references public.rentals (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  payment_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  car_id uuid not null references public.cars (id) on delete restrict,
  expense_date date not null,
  category text not null check (
    category in ('oil_change', 'tires', 'repairs', 'insurance', 'cleaning', 'other')
  ),
  amount numeric(12, 2) not null check (amount > 0),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.expenses.category is
  'oil_change, tires, repairs, and cleaning are maintenance. insurance and other count in total expenses but are not maintenance.';

create index cars_owner_idx on public.cars (owner_id);
create index rentals_owner_car_idx on public.rentals (owner_id, car_id);
create index payments_rental_idx on public.payments (rental_id, payment_date);
create index expenses_car_date_idx on public.expenses (car_id, expense_date);

create trigger cars_assign_owner
before insert or update on public.cars
for each row execute function public.assign_owner();

create trigger rentals_assign_owner
before insert or update on public.rentals
for each row execute function public.assign_owner();

create trigger rentals_enforce_car
before insert or update on public.rentals
for each row execute function public.enforce_rental_car();

create trigger payments_assign_owner
before insert or update on public.payments
for each row execute function public.assign_owner();

create trigger payments_enforce_rental
before insert or update on public.payments
for each row execute function public.enforce_payment_rental();

create trigger expenses_assign_owner
before insert or update on public.expenses
for each row execute function public.assign_owner();

create trigger expenses_enforce_car
before insert or update on public.expenses
for each row execute function public.enforce_expense_car();

alter table public.cars enable row level security;
alter table public.rentals enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;

revoke all on table public.cars from anon, public;
revoke all on table public.rentals from anon, public;
revoke all on table public.payments from anon, public;
revoke all on table public.expenses from anon, public;

grant select, insert, update, delete on table public.cars to authenticated;
grant select, insert, update, delete on table public.rentals to authenticated;
grant select, insert, update, delete on table public.payments to authenticated;
grant select, insert, update, delete on table public.expenses to authenticated;

create policy cars_select on public.cars
for select to authenticated
using (owner_id = (select auth.uid()));

create policy cars_insert on public.cars
for insert to authenticated
with check (owner_id = (select auth.uid()));

create policy cars_update on public.cars
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy cars_delete on public.cars
for delete to authenticated
using (owner_id = (select auth.uid()));

create policy rentals_select on public.rentals
for select to authenticated
using (owner_id = (select auth.uid()));

create policy rentals_insert on public.rentals
for insert to authenticated
with check (owner_id = (select auth.uid()));

create policy rentals_update on public.rentals
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy rentals_delete on public.rentals
for delete to authenticated
using (owner_id = (select auth.uid()));

create policy payments_select on public.payments
for select to authenticated
using (owner_id = (select auth.uid()));

create policy payments_insert on public.payments
for insert to authenticated
with check (owner_id = (select auth.uid()));

create policy payments_update on public.payments
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy payments_delete on public.payments
for delete to authenticated
using (owner_id = (select auth.uid()));

create policy expenses_select on public.expenses
for select to authenticated
using (owner_id = (select auth.uid()));

create policy expenses_insert on public.expenses
for insert to authenticated
with check (owner_id = (select auth.uid()));

create policy expenses_update on public.expenses
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy expenses_delete on public.expenses
for delete to authenticated
using (owner_id = (select auth.uid()));
