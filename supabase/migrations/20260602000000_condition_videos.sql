-- Condition videos for a rental. The file itself is private.
-- Storage path: {owner_id}/{rental_id}/{video_id}.mp4
-- Only the signed-in owner can read or write the row and the file.

create table public.condition_videos (
  id uuid primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  rental_id uuid not null references public.rentals (id) on delete cascade,
  car_id uuid not null references public.cars (id) on delete restrict,
  phase text not null check (phase in ('before_pickup', 'after_return')),
  notes text,
  license_plate text not null check (char_length(btrim(license_plate)) > 0),
  recorded_at timestamptz not null,
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rental_id, phase)
);

create index condition_videos_owner_idx on public.condition_videos (owner_id, rental_id);

create or replace function public.enforce_condition_video()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  rental_owner uuid;
  rental_car uuid;
begin
  select owner_id, car_id into rental_owner, rental_car
  from public.rentals
  where id = new.rental_id;
  if rental_owner is distinct from new.owner_id then
    raise exception 'rental not found for this owner';
  end if;
  if rental_car is distinct from new.car_id then
    raise exception 'video car does not match the rental';
  end if;
  return new;
end;
$$;

create trigger condition_videos_assign_owner
before insert or update on public.condition_videos
for each row execute function public.assign_owner();

create trigger condition_videos_enforce_rental
before insert or update on public.condition_videos
for each row execute function public.enforce_condition_video();

alter table public.condition_videos enable row level security;

revoke all on table public.condition_videos from anon, public;
grant select, insert, update, delete on table public.condition_videos to authenticated;

create policy condition_videos_select on public.condition_videos
for select to authenticated
using (owner_id = (select auth.uid()));

create policy condition_videos_insert on public.condition_videos
for insert to authenticated
with check (owner_id = (select auth.uid()));

create policy condition_videos_update on public.condition_videos
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy condition_videos_delete on public.condition_videos
for delete to authenticated
using (owner_id = (select auth.uid()));

insert into storage.buckets (id, name, public)
values ('condition-videos', 'condition-videos', false)
on conflict (id) do update set public = false;

drop policy if exists condition_videos_storage_select on storage.objects;
create policy condition_videos_storage_select
on storage.objects
for select to authenticated
using (
  bucket_id = 'condition-videos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists condition_videos_storage_insert on storage.objects;
create policy condition_videos_storage_insert
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'condition-videos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists condition_videos_storage_update on storage.objects;
create policy condition_videos_storage_update
on storage.objects
for update to authenticated
using (
  bucket_id = 'condition-videos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'condition-videos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists condition_videos_storage_delete on storage.objects;
create policy condition_videos_storage_delete
on storage.objects
for delete to authenticated
using (
  bucket_id = 'condition-videos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
