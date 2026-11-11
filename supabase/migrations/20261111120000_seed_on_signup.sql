-- On sign-up every photographer gets a profile and three starter packages,
-- so a new account is usable at once (Must 6).
--
-- security definer: the function runs as its owner, because at sign-up the new
-- user has no session yet and RLS would block the inserts.
-- Empty search_path: every name is schema-qualified, so no other schema can
-- slip in a table or function with the same name.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- The name is filled in by the photographer later (profiles_update_own).
  insert into public.profiles (id) values (new.id);

  -- Fictional starter packages; the photographer can edit or hide them.
  insert into public.packages (photographer_id, name, description, price, duration_hours) values
    (new.id, 'Essential', 'Ceremony and couple portraits', 1200.00, 3),
    (new.id, 'Half day', 'Getting ready, ceremony and reception start', 2200.00, 6),
    (new.id, 'Full day', 'From getting ready to the first dance', 3500.00, 10);

  return new;
end;
$$;

-- Only the trigger may run it: not callable through the REST API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
