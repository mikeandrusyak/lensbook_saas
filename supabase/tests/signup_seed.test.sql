begin;
select plan(12);

-- The SQL Editor shows only the last result set, so every assertion is stored here
-- and printed together at the end. The table lives in this transaction only.
create temp table results (line text);
grant all on pg_temp.results to authenticated;

-- 1. The trigger exists on auth.users
insert into pg_temp.results select has_trigger(
  'auth', 'users', 'on_auth_user_created',
  'auth.users has the sign-up seed trigger'
);

-- 2. The function runs as its owner (it must write rows for a user who has no session yet)
insert into pg_temp.results select is(
  (select prosecdef from pg_proc where oid = 'public.handle_new_user()'::regprocedure),
  true,
  'handle_new_user is security definer'
);

-- 3. ... and with an empty search_path (no hijacking through other schemas)
insert into pg_temp.results select is(
  (select proconfig from pg_proc where oid = 'public.handle_new_user()'::regprocedure),
  array['search_path=""'],
  'handle_new_user has an empty search_path'
);

-- 4.-5. Nobody can call it through the API, only the trigger runs it
insert into pg_temp.results select ok(
  not has_function_privilege('anon', 'public.handle_new_user()', 'execute'),
  'anon cannot execute handle_new_user'
);

insert into pg_temp.results select ok(
  not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute'),
  'authenticated cannot execute handle_new_user'
);

-- Two fictional photographers sign up. Nothing else is inserted by hand.
insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-00000000000a', 'authenticated', 'authenticated', 'a@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'authenticated', 'authenticated', 'b@example.test');

-- 6. A profile was created
insert into pg_temp.results select is(
  (select count(*) from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  1::bigint,
  'sign-up creates a profile'
);

-- 7. Exactly three packages were created
insert into pg_temp.results select is(
  (select count(*) from public.packages where photographer_id = '00000000-0000-0000-0000-00000000000a'),
  3::bigint,
  'sign-up creates three packages'
);

-- 8. They are the three starter packages
insert into pg_temp.results select set_eq(
  $$select name from public.packages
    where photographer_id = '00000000-0000-0000-0000-00000000000a'$$,
  array['Essential', 'Half day', 'Full day'],
  'the three starter packages are Essential, Half day and Full day'
);

-- 9. All of them are active
insert into pg_temp.results select is(
  (select count(*) from public.packages
   where photographer_id = '00000000-0000-0000-0000-00000000000a' and not is_active),
  0::bigint,
  'the starter packages are active'
);

-- 10. B got their own three packages (separate rows, not shared with A)
insert into pg_temp.results select is(
  (select count(*) from public.packages where photographer_id = '00000000-0000-0000-0000-00000000000b'),
  3::bigint,
  'the second photographer gets their own three packages'
);

-- From here on we act as photographer A.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a"}', true);

-- 11. A sees exactly their three packages, none of B's
insert into pg_temp.results select is(
  (select count(*) from public.packages),
  3::bigint,
  'A sees exactly their three packages'
);

-- 12. A sees exactly their own profile
insert into pg_temp.results select is(
  (select count(*) from public.profiles),
  1::bigint,
  'A sees exactly one profile'
);

reset role;

-- finish() returns rows only when something is wrong (failed or missing tests).
insert into pg_temp.results select * from finish();

select line from pg_temp.results;
rollback;
