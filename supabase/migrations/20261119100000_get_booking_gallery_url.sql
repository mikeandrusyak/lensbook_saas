-- Step 7.5: the couple sees the gallery link, but only in status Gallery Delivered.
--
-- get_booking now always returns the key gallery_url. It is null in every status except
-- gallery_delivered, even when the photographer has already saved a link: a link saved
-- early (for example while the photos are still being edited) must not leak to the couple.
-- The key is always present, so the shape of the answer does not depend on the status.
--
-- "create or replace" keeps owner, security definer, empty search_path and the grants
-- (anon and authenticated may execute). Everything else is unchanged from
-- 20261118130000_get_booking.sql; only status and gallery_url are read in addition.
create or replace function public.get_booking(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_project record;
begin
  -- A real token is 43 characters (32 bytes as base64url). Cheap guard against huge input.
  if p_token is null or length(p_token) not between 1 and 200 then
    return null;
  end if;

  -- The join also requires the client to belong to the same photographer as the project.
  select p.id, p.photographer_id, c.names, p.event_date, p.location, p.status, p.gallery_url
  into v_project
  from public.projects p
  join public.clients c
    on c.id = p.client_id and c.photographer_id = p.photographer_id
  where p.access_token_hash = sha256(convert_to(p_token, 'UTF8'));

  if not found then
    return null;
  end if;

  -- No email, no photographer_id, no project id: the page does not need them.
  return jsonb_build_object(
    'names', v_project.names,
    'event_date', v_project.event_date,
    'location', v_project.location,
    -- "case" without "else" gives null: the link only in Gallery Delivered.
    'gallery_url', case
      when v_project.status = 'gallery_delivered' then v_project.gallery_url
    end,
    'already_signed', exists (
      select 1 from public.contracts ct where ct.project_id = v_project.id
    ),
    -- Only active packages of this project's photographer; hidden ones are never offered.
    'packages', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', pk.id,
          'name', pk.name,
          'description', pk.description,
          'price', pk.price,
          'duration_hours', pk.duration_hours
        ) order by pk.created_at, pk.id
      )
      from public.packages pk
      where pk.photographer_id = v_project.photographer_id and pk.is_active
    ), '[]'::jsonb)
  );
end;
$$;
