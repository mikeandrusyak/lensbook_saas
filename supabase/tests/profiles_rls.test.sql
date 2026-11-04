begin;
select plan(7);

-- The SQL Editor shows only the last result set, so every assertion is stored here
-- and printed together at the end. The table lives in this transaction only.
create temp table results (line text);
grant all on pg_temp.results to authenticated;

-- Fictional users: A and B have a profile, C has none (used for the insert test).
insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-00000000000a', 'authenticated', 'authenticated', 'a@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'authenticated', 'authenticated', 'b@example.test'),
  ('00000000-0000-0000-0000-00000000000c', 'authenticated', 'authenticated', 'c@example.test');

-- Runs as the table owner, so RLS does not apply to this setup insert.
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'Photographer A'),
  ('00000000-0000-0000-0000-00000000000b', 'Photographer B');

-- 1. RLS is enabled
insert into pg_temp.results select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS is enabled on profiles'
);

-- 2. anon has no privilege on the table
insert into pg_temp.results select ok(
  not has_table_privilege('anon', 'public.profiles', 'select'),
  'anon has no select privilege on profiles'
);

-- From here on we act as photographer A.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a"}', true);

-- 3. A sees exactly one profile
insert into pg_temp.results select is(
  (select count(*) from public.profiles),
  1::bigint,
  'A sees exactly one profile'
);

-- 4. That profile is not B's
insert into pg_temp.results select is(
  (select count(*) from public.profiles where id = '00000000-0000-0000-0000-00000000000b'),
  0::bigint,
  'A does not see the profile of B'
);

-- 5. A can update their own profile
update public.profiles set display_name = 'A renamed'
where id = '00000000-0000-0000-0000-00000000000a';

insert into pg_temp.results select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'A renamed',
  'A can update their own profile'
);

-- 6. A cannot insert a profile for another user (with check fails, 42501)
insert into pg_temp.results select throws_ok(
  $$insert into public.profiles (id, display_name)
    values ('00000000-0000-0000-0000-00000000000c', 'fake')$$,
  '42501',
  null,
  'A cannot insert a profile with a foreign id'
);

-- 7. A cannot update B's profile. RLS hides the row, so the update changes nothing;
-- we check B's name as the table owner (reset role), because A cannot see B.
update public.profiles set display_name = 'hacked'
where id = '00000000-0000-0000-0000-00000000000b';

reset role;

insert into pg_temp.results select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000b'),
  'Photographer B',
  'A cannot update the profile of B'
);

-- finish() returns rows only when something is wrong (failed or missing tests).
insert into pg_temp.results select * from finish();

select line from pg_temp.results;
rollback;
