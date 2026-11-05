-- The 5 project statuses. The order matters: the status trigger (step 2.4)
-- allows only one step forward or back in this order.
create type public.project_status as enum (
  'inquiry',
  'consultation',
  'retainer_paid',
  'awaiting_event',
  'gallery_delivered'
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references public.profiles (id) on delete cascade,
  names text not null,
  -- Required: the only way to reach a client who has lost their booking link.
  email text not null,
  created_at timestamptz not null default now()
);

-- Every policy filters by photographer_id, so the lookup should be indexed.
create index clients_photographer_id_idx on public.clients (photographer_id);

-- RLS is enabled in the same migration, before any row exists.
alter table public.clients enable row level security;

-- anon must never touch this table.
revoke all on public.clients from anon;

create policy "clients_select_own"
  on public.clients for select to authenticated
  using (photographer_id = (select auth.uid()));

create policy "clients_insert_own"
  on public.clients for insert to authenticated
  with check (photographer_id = (select auth.uid()));

create policy "clients_update_own"
  on public.clients for update to authenticated
  using (photographer_id = (select auth.uid()))
  with check (photographer_id = (select auth.uid()));

-- Delete is allowed (a client may ask to have their data removed).
-- Step 2.3 adds projects.client_id with on delete restrict, so a client
-- that still has a project cannot be deleted.
create policy "clients_delete_own"
  on public.clients for delete to authenticated
  using (photographer_id = (select auth.uid()));
