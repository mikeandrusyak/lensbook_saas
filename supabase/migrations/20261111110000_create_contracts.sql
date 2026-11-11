-- Target for the composite foreign key below: lets contracts reference
-- "this project of this photographer". id alone is already unique, so this
-- adds no new restriction on projects.
alter table public.projects
  add constraint projects_id_photographer_id_key unique (id, photographer_id);

-- A signed booking: one per project. Created only by submit_booking (Phase 6),
-- which runs as security definer; the app itself may only read contracts.
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references public.profiles (id) on delete cascade,
  -- unique: a project has at most one contract (makes submit_booking idempotent).
  project_id uuid not null unique,
  package_id uuid not null,
  -- Copy of the package (name, price, hours, ...) at signing time, so later
  -- edits of the package do not change what the couple signed.
  package_snapshot jsonb not null check (jsonb_typeof(package_snapshot) = 'object'),
  -- Typed signature: the full name the couple entered.
  signer_name text not null check (length(trim(signer_name)) between 1 and 200),
  signed_at timestamptz not null default now(),

  -- The project must belong to the same photographer. Cascade: deleting a
  -- project (e.g. on a client's erasure request) also removes its contract.
  foreign key (project_id, photographer_id)
    references public.projects (id, photographer_id) on delete cascade,
  -- The package must belong to the same photographer. Packages are never
  -- deleted by the app (only hidden), so no on delete action is needed.
  foreign key (package_id, photographer_id)
    references public.packages (id, photographer_id)
);

create index contracts_photographer_id_idx on public.contracts (photographer_id);
-- Covers the foreign key check when a package row is touched.
create index contracts_package_id_idx on public.contracts (package_id);

-- RLS is enabled in the same migration, before any row exists.
alter table public.contracts enable row level security;

-- anon must never touch this table.
revoke all on public.contracts from anon;
-- The app may only read: a signed contract cannot be forged, changed or removed
-- by the photographer. (Deleting the project or the account still cascades.)
revoke insert, update, delete on public.contracts from authenticated;

create policy "contracts_select_own"
  on public.contracts for select to authenticated
  using (photographer_id = (select auth.uid()));
