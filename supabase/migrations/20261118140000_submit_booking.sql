-- The only door through which a couple (not logged in) writes anything: the booking page
-- calls this function to sign. anon has no table access; contracts has no insert policy.
--
-- Security definer + empty search_path, like get_booking. Because it runs with the owner's
-- rights it checks everything itself and never trusts the caller:
--   * the token is hashed and must match a project (same SHA-256 as lib/tokens.ts);
--   * the package must belong to that project's photographer and be active;
--   * the couple must consent and type a signature of 1-200 characters.
--
-- Returns true when the booking is signed (now, or earlier: resubmitting is harmless),
-- and false in every failure case. One answer for all failures, so a guesser learns
-- nothing about which tokens or packages exist. It does not change the project status:
-- the deposit (Retainer Paid) is confirmed manually by the photographer in Phase 7.
create function public.submit_booking(
  p_token text,
  p_package_id uuid,
  p_signer_name text,
  p_consent boolean,
  p_names text default null,
  p_location text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_signer text := trim(p_signer_name);
  v_names text := nullif(trim(p_names), '');
  v_location text := nullif(trim(p_location), '');
  v_project record;
  v_package record;
  v_rows integer;
begin
  -- Cheap input checks first. "is not true" also catches null.
  if p_token is null or length(p_token) not between 1 and 200
     or p_package_id is null
     or p_consent is not true
     or v_signer is null or length(v_signer) not between 1 and 200
     or length(v_names) > 200
     or length(v_location) > 200 then
    return false;
  end if;

  select id, photographer_id, client_id
  into v_project
  from public.projects
  where access_token_hash = sha256(convert_to(p_token, 'UTF8'));

  if not found then
    return false;
  end if;

  -- The package must belong to the same photographer and must not be hidden.
  select name, description, price, duration_hours
  into v_package
  from public.packages
  where id = p_package_id
    and photographer_id = v_project.photographer_id
    and is_active;

  if not found then
    return false;
  end if;

  -- unique(project_id): a second call (double click, back button) inserts nothing,
  -- keeps the first signature and still answers true. Two parallel calls cannot both win.
  insert into public.contracts (photographer_id, project_id, package_id, package_snapshot, signer_name)
  values (
    v_project.photographer_id,
    v_project.id,
    p_package_id,
    jsonb_build_object(
      'name', v_package.name,
      'description', v_package.description,
      'price', v_package.price,
      'duration_hours', v_package.duration_hours
    ),
    v_signer
  )
  on conflict (project_id) do nothing;

  get diagnostics v_rows = row_count;

  -- Only the first, real signature may change the couple's details.
  if v_rows = 1 then
    update public.clients
    set names = coalesce(v_names, names)
    where id = v_project.client_id and photographer_id = v_project.photographer_id;

    update public.projects
    set location = coalesce(v_location, location)
    where id = v_project.id;
  end if;

  return true;
end;
$$;

-- anon (the couple) and authenticated (a photographer who opens the link while logged in)
-- may call it; nobody else. Explicit, because new functions are executable by public by default.
revoke execute on function public.submit_booking(text, uuid, text, boolean, text, text) from public;
grant execute on function public.submit_booking(text, uuid, text, boolean, text, text) to anon, authenticated;
