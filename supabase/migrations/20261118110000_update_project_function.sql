-- Edits a project and its client in one call, so both change or neither does:
-- the body of a function runs in a single transaction.
--
-- Security invoker: the function runs with the rights of the logged-in user, so RLS
-- applies. A project of another photographer is invisible to the update, which then
-- touches no row. The status is not a parameter and is never changed here.
-- Empty search_path: every name is schema-qualified (pg_catalog is always searched).
create function public.update_project(
  p_project_id uuid,
  p_names text,
  p_email text,
  p_event_date date,
  p_location text
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

-- Supabase grants execute on new functions to anon by default, and public can execute
-- by default. Only logged-in users may call this one.
revoke execute on function public.update_project(uuid, text, text, date, text) from public, anon;
grant execute on function public.update_project(uuid, text, text, date, text) to authenticated;
