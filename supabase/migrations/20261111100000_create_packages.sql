-- Service packages a photographer offers (e.g. "Basic", "Full day").
create table public.packages (
  id uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  description text,
  -- Francs with two decimals; numeric is exact (no float rounding).
  price numeric(10, 2) not null check (price >= 0),
  duration_hours numeric(4, 1) not null check (duration_hours > 0),
  -- Packages are hidden instead of deleted, so old contracts and the
  -- booking page never point to a package that is gone.
  is_active boolean not null default true,
  created_at timestamptz not null default now(),

  -- Target for composite foreign keys (contracts.package_id): lets other
  -- tables reference "this package of this photographer".
  unique (id, photographer_id)
);

create index packages_photographer_id_idx on public.packages (photographer_id);

-- RLS is enabled in the same migration, before any row exists.
alter table public.packages enable row level security;

-- anon must never touch this table.
revoke all on public.packages from anon;
-- No delete for the app either (hide with is_active instead). Deleting a whole
-- account still cascades, because that runs as the table owner.
revoke delete on public.packages from authenticated;

create policy "packages_select_own"
  on public.packages for select to authenticated
  using (photographer_id = (select auth.uid()));

create policy "packages_insert_own"
  on public.packages for insert to authenticated
  with check (photographer_id = (select auth.uid()));

create policy "packages_update_own"
  on public.packages for update to authenticated
  using (photographer_id = (select auth.uid()))
  with check (photographer_id = (select auth.uid()));
