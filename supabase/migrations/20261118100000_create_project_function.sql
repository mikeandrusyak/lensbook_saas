-- Creates a client and their project in one call, so both rows exist or neither does:
-- the body of a function runs in a single transaction.
--
-- Security invoker (the default, stated here on purpose): the function runs with the
-- rights of the logged-in user, so RLS applies exactly as for direct inserts.
-- The photographer is always auth.uid(), never a parameter, so a caller cannot
-- create rows for someone else.
-- Empty search_path: every name is schema-qualified (pg_catalog is always searched).
-- The project gets the default status inquiry, which the status trigger requires.
create function public.create_project(
  p_names text,
  p_email text,
  p_event_date date,
  p_location text
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

-- New functions are executable by public by default, and Supabase also grants
-- execute to anon on new functions in public. Only logged-in users may call this one.
revoke execute on function public.create_project(text, text, date, text) from public, anon;
grant execute on function public.create_project(text, text, date, text) to authenticated;
