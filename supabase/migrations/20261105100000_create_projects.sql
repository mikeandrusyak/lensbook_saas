-- Target for the composite foreign key below: lets projects reference
-- "this client of this photographer". id alone is already unique, so this
-- adds no new restriction on clients.
alter table public.clients
  add constraint clients_id_photographer_id_key unique (id, photographer_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null,
  -- Optional: an inquiry may come in before the couple has a date or a venue.
  event_date date,
  location text,
  status public.project_status not null default 'inquiry',
  -- SHA-256 of the booking token (filled in Phase 6). Never the token itself.
  -- A check on null passes, so the column may stay empty.
  access_token_hash bytea unique check (octet_length(access_token_hash) = 32),
  gallery_url text check (gallery_url ~ '^https://'),
  created_at timestamptz not null default now(),

  -- The client must belong to the same photographer as the project.
  -- No on delete action (default "no action"): a client that still has a
  -- project cannot be deleted. Deleting a whole account still cascades
  -- through clients and projects (both covered by tests).
  foreign key (client_id, photographer_id)
    references public.clients (id, photographer_id)
);

create index projects_photographer_id_idx on public.projects (photographer_id);
create index projects_event_date_idx on public.projects (event_date);
-- Also covers lookups of a client's projects (e.g. the foreign key check on client delete).
create index projects_client_id_idx on public.projects (client_id);

-- RLS is enabled in the same migration, before any row exists.
alter table public.projects enable row level security;

-- anon must never touch this table.
revoke all on public.projects from anon;

create policy "projects_select_own"
  on public.projects for select to authenticated
  using (photographer_id = (select auth.uid()));

create policy "projects_insert_own"
  on public.projects for insert to authenticated
  with check (photographer_id = (select auth.uid()));

create policy "projects_update_own"
  on public.projects for update to authenticated
  using (photographer_id = (select auth.uid()))
  with check (photographer_id = (select auth.uid()));

create policy "projects_delete_own"
  on public.projects for delete to authenticated
  using (photographer_id = (select auth.uid()));
