-- The only door through which a couple (not logged in) reads anything: the booking page
-- /book/[token] calls this function. anon has no table access at all.
--
-- Security definer: runs with the rights of the function owner, so it can read the tables
-- that RLS hides from anon. That is why it must stay small and return only what the page needs.
-- Empty search_path: every name is schema-qualified (pg_catalog is always searched,
-- which is where sha256 and convert_to live).
--
-- The token arrives as text and is hashed here with SHA-256, the same way lib/tokens.ts does
-- it when the link is created. Only the hash is stored, never the token.
--
-- An invalid, empty, oversized or unknown token returns null, the same answer in every case,
-- so a guesser learns nothing about which tokens exist.
create function public.get_booking(p_token text)
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
  select p.id, p.photographer_id, c.names, p.event_date, p.location
  into v_project
  from public.projects p
  join public.clients c
    on c.id = p.client_id and c.photographer_id = p.photographer_id
  where p.access_token_hash = sha256(convert_to(p_token, 'UTF8'));

  if not found then
    return null;
  end if;

  -- No email, no gallery link, no photographer_id, no project id: the page does not need them.
  return jsonb_build_object(
    'names', v_project.names,
    'event_date', v_project.event_date,
    'location', v_project.location,
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

-- New functions are executable by public by default, and Supabase also grants execute to anon.
-- State it explicitly: anon (the couple) and authenticated (a photographer who opens the link
-- while logged in) may call it; nobody else.
revoke execute on function public.get_booking(text) from public;
grant execute on function public.get_booking(text) to anon, authenticated;
