-- Save or clear the link to the external gallery of a project.
--
-- Security invoker (like update_project): the function runs with the rights of the
-- logged-in photographer, so the RLS policy "projects_update_own" decides which rows
-- it can see. The rules for the value itself stay in the table, not here:
--   - check gallery_url ~ '^https://'                      (only https links)
--   - check status <> 'gallery_delivered' or gallery_url is not null
-- Both raise 23514 (check_violation), so they also hold for a direct update.
--
-- p_gallery_url defaults to null: calling without it clears the link.
create function public.set_gallery_url(
  p_project_id uuid,
  p_gallery_url text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.projects
  set gallery_url = p_gallery_url
  where id = p_project_id;

  -- No row: the project does not exist or belongs to someone else. Both cases give the
  -- same error, so the answer does not reveal whether a project exists.
  if not found then
    raise exception 'project not found' using errcode = 'no_data_found';
  end if;
end;
$$;

-- Supabase grants execute on new functions to anon by default, and public can execute
-- every new function. Only logged-in photographers may call this one.
revoke execute on function public.set_gallery_url(uuid, text) from public, anon;
grant execute on function public.set_gallery_url(uuid, text) to authenticated;
