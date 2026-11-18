begin;
select plan(13);

-- The SQL Editor shows only the last result set, so every assertion is stored here
-- and printed together at the end. The table lives in this transaction only.
create temp table results (line text);
grant all on pg_temp.results to anon, authenticated;

-- Fictional photographers A and B. The sign-up trigger creates their profiles
-- and seeds 3 active packages for each.
insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-00000000000a', 'authenticated', 'authenticated', 'a@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'authenticated', 'authenticated', 'b@example.test');

-- One client and project for A. Runs as the table owner, so RLS does not apply.
insert into public.clients (id, photographer_id, names, email) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a',
   'Anna & Ben', 'anna.ben@example.test');

-- The project gets a gallery link and a booking token. The test token is plain text here;
-- the database stores only its SHA-256 hash, exactly like lib/tokens.ts does.
insert into public.projects (id, photographer_id, client_id, event_date, location,
                             access_token_hash, gallery_url) values
  ('00000000-0000-0000-0000-000000000a11', '00000000-0000-0000-0000-00000000000a',
   '00000000-0000-0000-0000-0000000000a1', '2027-05-15', 'A venue',
   sha256(convert_to('fictional-test-token-a', 'UTF8')), 'https://gallery.example.test/secret');

-- One of A's packages is hidden, so we can check it is not offered.
update public.packages set is_active = false
where id = (select id from public.packages
            where photographer_id = '00000000-0000-0000-0000-00000000000a'
            order by created_at, id limit 1);

-- 1. The function exists with the expected signature
insert into pg_temp.results select has_function(
  'public', 'get_booking', array['text'],
  'get_booking(token) exists'
);

-- 2. security definer, because anon has no table access
insert into pg_temp.results select is(
  (select prosecdef from pg_proc where oid = 'public.get_booking(text)'::regprocedure),
  true,
  'get_booking is security definer'
);

-- 3. Empty search_path (no hijacking through other schemas)
insert into pg_temp.results select is(
  (select proconfig from pg_proc where oid = 'public.get_booking(text)'::regprocedure),
  array['search_path=""'],
  'get_booking has an empty search_path'
);

-- 4. anon (the couple, not logged in) may call it
insert into pg_temp.results select ok(
  has_function_privilege('anon', 'public.get_booking(text)', 'execute'),
  'anon can execute get_booking'
);

-- From here on we act as anon, like the public booking page does.
set local role anon;

-- 5. A valid token returns the couple's project data
insert into pg_temp.results select is(
  public.get_booking('fictional-test-token-a') ->> 'names',
  'Anna & Ben',
  'valid token returns the client names'
);

-- 6. Only active packages of the same photographer are offered:
--    A has 3 seeded packages, one is hidden, B's packages never appear.
insert into pg_temp.results select is(
  jsonb_array_length(public.get_booking('fictional-test-token-a') -> 'packages'),
  2,
  'only the 2 active packages of this photographer are returned'
);

-- 7. Nothing beyond what the booking page needs: no email, no gallery link, no ids of the owner.
insert into pg_temp.results select is(
  (select array_agg(k order by k) from jsonb_object_keys(public.get_booking('fictional-test-token-a')) k),
  array['already_signed', 'event_date', 'location', 'names', 'packages'],
  'the answer has only the expected keys'
);

insert into pg_temp.results select is(
  (select array_agg(k order by k)
   from jsonb_object_keys(public.get_booking('fictional-test-token-a') -> 'packages' -> 0) k),
  array['description', 'duration_hours', 'id', 'name', 'price'],
  'a package has only the expected keys'
);

-- 8. A new project has no contract yet
insert into pg_temp.results select is(
  (public.get_booking('fictional-test-token-a') ->> 'already_signed')::boolean,
  false,
  'already_signed is false before signing'
);

-- 9. Garbage, empty and null tokens all give the same answer as a token that does not exist
insert into pg_temp.results select ok(
  public.get_booking('no-such-token') is null
  and public.get_booking('') is null
  and public.get_booking(null) is null
  and public.get_booking(repeat('x', 5000)) is null,
  'unknown, empty, null and oversized tokens all return null (indistinguishable)'
);

-- 10. A token is not a project id: the project id itself does not open anything
insert into pg_temp.results select ok(
  public.get_booking('00000000-0000-0000-0000-000000000a11') is null,
  'the project id is not accepted as a token'
);

-- "New link" (step 4.7) replaces the hash. Runs as the table owner.
reset role;
update public.projects
set access_token_hash = sha256(convert_to('fictional-test-token-a-new', 'UTF8'))
where id = '00000000-0000-0000-0000-000000000a11';
set local role anon;

-- 11. The old token stops working (carried over from step 4.8)
insert into pg_temp.results select ok(
  public.get_booking('fictional-test-token-a') is null,
  'after "New link" the old token returns null'
);

-- 12. The new token works
insert into pg_temp.results select is(
  public.get_booking('fictional-test-token-a-new') ->> 'names',
  'Anna & Ben',
  'after "New link" the new token works'
);

-- finish() returns rows only when something is wrong (failed or missing tests).
reset role;
insert into pg_temp.results select * from finish();

select line from pg_temp.results;
rollback;
