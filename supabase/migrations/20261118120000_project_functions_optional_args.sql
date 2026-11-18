-- Date and location are optional, so the two project functions now say so: the last
-- two parameters get "default null". Behaviour for callers that pass null does not
-- change. The benefit is in the generated TypeScript types (supabase gen types): an
-- argument with a default becomes optional, while a plain "date" or "text" argument is
-- typed as string without null, which does not match how the app calls the functions.
--
-- "create or replace" keeps owner, security invoker, empty search_path and the grants
-- (anon cannot execute, authenticated can). Postgres allows a default only on trailing
-- parameters; these are the last two in both functions.
create or replace function public.create_project(
  p_names text,
  p_email text,
  p_event_date date default null,
  p_location text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_client_id uuid;
  v_project_id uuid;
begin
  insert into public.clients (photographer_id, names, email)
  values ((select auth.uid()), p_names, p_email)
  returning id into v_client_id;

  insert into public.projects (photographer_id, client_id, event_date, location)
  values ((select auth.uid()), v_client_id, p_event_date, p_location)
  returning id into v_project_id;

  return v_project_id;
end;
$$;

create or replace function public.update_project(
  p_project_id uuid,
  p_names text,
  p_email text,
  p_event_date date default null,
  p_location text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_client_id uuid;
begin
  update public.projects
  set event_date = p_event_date, location = p_location
  where id = p_project_id
  returning client_id into v_client_id;

  -- No row: the project does not exist or belongs to someone else. Both cases give the
  -- same error, so the answer does not reveal whether a project exists.
  if not found then
    raise exception 'project not found' using errcode = 'no_data_found';
  end if;

  update public.clients
  set names = p_names, email = p_email
  where id = v_client_id;
end;
$$;
