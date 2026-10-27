-- =====================================================================
--  Senator Kondo Properties – database setup (run ONCE in Supabase)
--  Supabase dashboard → SQL Editor → New query → paste everything → Run
--  Safe to run again: it will not delete your listings.
-- =====================================================================

-- 1) Listings table ----------------------------------------------------
create table if not exists public.listings (
  id          bigint generated always as identity primary key,
  title       text    not null check (char_length(title) between 3 and 120),
  type        text    not null check (type in ('House','Apartment','Land','Commercial')),
  purpose     text    not null check (purpose in ('Sale','Rent')),
  status      text    not null default 'available' check (status in ('available','reserved','sold','let')),
  loc         text    not null check (char_length(loc) between 2 and 150),
  price       numeric not null check (price >= 0),
  beds        int     not null default 0 check (beds between 0 and 50),
  size        text    not null default '',
  description text    not null default '',
  amenities   text[]  not null default '{}',
  images      text[]  not null default '{}',
  featured    boolean not null default false,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists listings_touch on public.listings;
create trigger listings_touch before update on public.listings
for each row execute function public.touch_updated_at();

-- 2) Who is an administrator ---------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;   -- no policies = not readable through the website API

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 3) Rules: the public can only READ published listings; only admins can change anything
alter table public.listings enable row level security;
grant select on public.listings to anon, authenticated;
grant insert, update, delete on public.listings to authenticated;

drop policy if exists "Public reads published listings" on public.listings;
create policy "Public reads published listings" on public.listings
  for select to anon, authenticated using (published = true);

drop policy if exists "Admins read all listings" on public.listings;
create policy "Admins read all listings" on public.listings
  for select to authenticated using (public.is_admin());

drop policy if exists "Admins insert listings" on public.listings;
create policy "Admins insert listings" on public.listings
  for insert to authenticated with check (public.is_admin());

drop policy if exists "Admins update listings" on public.listings;
create policy "Admins update listings" on public.listings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins delete listings" on public.listings;
create policy "Admins delete listings" on public.listings
  for delete to authenticated using (public.is_admin());

-- 4) Photo storage: public can view, only admins can upload / delete -------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public views listing images" on storage.objects;
create policy "Public views listing images" on storage.objects
  for select using (bucket_id = 'listing-images');

drop policy if exists "Admins upload listing images" on storage.objects;
create policy "Admins upload listing images" on storage.objects
  for insert to authenticated with check (bucket_id = 'listing-images' and public.is_admin());

drop policy if exists "Admins update listing images" on storage.objects;
create policy "Admins update listing images" on storage.objects
  for update to authenticated using (bucket_id = 'listing-images' and public.is_admin());

drop policy if exists "Admins delete listing images" on storage.objects;
create policy "Admins delete listing images" on storage.objects
  for delete to authenticated using (bucket_id = 'listing-images' and public.is_admin());

-- 5) Team members and client reviews (managed from the admin page) ---------
create table if not exists public.team_members (
  id         bigint generated always as identity primary key,
  name       text not null check (char_length(name) between 2 and 100),
  role       text not null default '',
  phone      text not null default '',
  bio        text not null default '',
  photo      text not null default '',
  sort       int  not null default 0,
  published  boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.testimonials (
  id         bigint generated always as identity primary key,
  name       text not null check (char_length(name) between 2 and 100),
  detail     text not null default '',
  rating     int  not null default 5 check (rating between 1 and 5),
  quote      text not null check (char_length(quote) between 10 and 600),
  sort       int  not null default 0,
  published  boolean not null default true,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['team_members','testimonials'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists "Public reads published" on public.%I', t);
    execute format('create policy "Public reads published" on public.%I for select to anon, authenticated using (published = true)', t);
    execute format('drop policy if exists "Admins read all" on public.%I', t);
    execute format('create policy "Admins read all" on public.%I for select to authenticated using (public.is_admin())', t);
    execute format('drop policy if exists "Admins insert" on public.%I', t);
    execute format('create policy "Admins insert" on public.%I for insert to authenticated with check (public.is_admin())', t);
    execute format('drop policy if exists "Admins update" on public.%I', t);
    execute format('create policy "Admins update" on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('drop policy if exists "Admins delete" on public.%I', t);
    execute format('create policy "Admins delete" on public.%I for delete to authenticated using (public.is_admin())', t);
  end loop;
end $$;

-- 6) Site settings: contact details, About text, site photos (managed from the admin page)
create table if not exists public.site_settings (
  id         int primary key check (id = 1),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;
drop policy if exists "Public reads settings" on public.site_settings;
create policy "Public reads settings" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "Admins insert settings" on public.site_settings;
create policy "Admins insert settings" on public.site_settings for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins update settings" on public.site_settings;
create policy "Admins update settings" on public.site_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- 7) AFTER creating your admin user (see SETUP.md step 3), run this ONE line
--    with your real admin email, in a separate query:
--
--    insert into public.admins (user_id) select id from auth.users where email = 'YOUR-ADMIN-EMAIL@example.com';
