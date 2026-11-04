create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default ''
);

-- RLS is enabled in the same migration, before any row exists.
alter table public.profiles enable row level security;

-- anon must never touch this table.
revoke all on public.profiles from anon;

create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No delete policy: the row is removed with the auth user (on delete cascade).
