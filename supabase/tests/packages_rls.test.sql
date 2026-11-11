begin;
select plan(13);

-- The SQL Editor shows only the last result set, so every assertion is stored here
-- and printed together at the end. The table lives in this transaction only.
create temp table results (line text);
grant all on pg_temp.results to authenticated;

-- Fictional photographers A and B, each with a profile.
insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-00000000000a', 'authenticated', 'authenticated', 'a@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'authenticated', 'authenticated', 'b@example.test');

-- Since step 2.6 the sign-up trigger already created the profiles, so only set the name.
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'Photographer A'),
  ('00000000-0000-0000-0000-00000000000b', 'Photographer B')
on conflict (id) do update set display_name = excluded.display_name;

-- One package per photographer. Runs as the table owner, so RLS does not apply.
insert into public.packages (id, photographer_id, name, description, price, duration_hours) values
  ('00000000-0000-0000-0000-00000000a0a1', '00000000-0000-0000-0000-00000000000a',
   'Basic', 'Ceremony only', 1200.00, 3),
  ('00000000-0000-0000-0000-00000000b0b1', '00000000-0000-0000-0000-00000000000b',
   'Full day', 'From getting ready to first dance', 3500.00, 10);

-- 1. RLS is enabled
insert into pg_temp.results select ok(
  (select relrowsecurity from pg_class where oid = 'public.packages'::regclass),
  'RLS is enabled on packages'
);

-- 2. anon has no privilege on the table
insert into pg_temp.results select ok(
  not has_table_privilege('anon', 'public.packages', 'select'),
  'anon has no select privilege on packages'
);

-- 3. Packages are hidden, not deleted: authenticated has no delete privilege
insert into pg_temp.results select ok(
  not has_table_privilege('authenticated', 'public.packages', 'delete'),
  'authenticated has no delete privilege on packages'
);

-- From here on we act as photographer A.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a"}', true);

-- 4. Every package A sees is their own (A also has the 3 starter packages from step 2.6)
insert into pg_temp.results select is(
  (select count(*) from public.packages
   where photographer_id <> '00000000-0000-0000-0000-00000000000a'),
  0::bigint,
  'A sees only their own packages'
);

-- 5. That package is not B's
insert into pg_temp.results select is(
  (select count(*) from public.packages where id = '00000000-0000-0000-0000-00000000b0b1'),
  0::bigint,
  'A does not see the package of B'
);

-- 6. A can add their own package
insert into pg_temp.results select lives_ok(
  $$insert into public.packages (id, photographer_id, name, price, duration_hours)
    values ('00000000-0000-0000-0000-00000000a0a2', '00000000-0000-0000-0000-00000000000a',
            'Half day', 2200.00, 6)$$,
  'A can insert their own package'
);

-- 7. A new package is active by default
insert into pg_temp.results select is(
  (select is_active from public.packages where id = '00000000-0000-0000-0000-00000000a0a2'),
  true,
  'a new package is active by default'
);

-- 8. A cannot add a package in B's name (RLS with check, 42501)
insert into pg_temp.results select throws_ok(
  $$insert into public.packages (photographer_id, name, price, duration_hours)
    values ('00000000-0000-0000-0000-00000000000b', 'Fake', 1.00, 1)$$,
  '42501',
  null,
  'A cannot insert a package for B'
);

-- 9. A negative price is rejected (check constraint, 23514)
insert into pg_temp.results select throws_ok(
  $$update public.packages set price = -1
    where id = '00000000-0000-0000-0000-00000000a0a1'$$,
  '23514',
  null,
  'a negative price is rejected'
);

-- 10. A duration of zero hours is rejected (check constraint, 23514)
insert into pg_temp.results select throws_ok(
  $$update public.packages set duration_hours = 0
    where id = '00000000-0000-0000-0000-00000000a0a1'$$,
  '23514',
  null,
  'duration_hours = 0 is rejected'
);

-- 11. A can hide their own package
insert into pg_temp.results select lives_ok(
  $$update public.packages set is_active = false
    where id = '00000000-0000-0000-0000-00000000a0a1'$$,
  'A can hide their own package'
);

-- 12. A cannot delete even their own package (no delete privilege, 42501)
insert into pg_temp.results select throws_ok(
  $$delete from public.packages where id = '00000000-0000-0000-0000-00000000a0a1'$$,
  '42501',
  null,
  'A cannot delete their own package'
);

-- A tries to change B's package. RLS hides the row, so nothing changes;
-- we check as the table owner (reset role), because A cannot see B's rows.
update public.packages set price = 1
where id = '00000000-0000-0000-0000-00000000b0b1';

reset role;

-- 13. B's package is unchanged
insert into pg_temp.results select is(
  (select price from public.packages where id = '00000000-0000-0000-0000-00000000b0b1'),
  3500.00::numeric,
  'A cannot update the package of B'
);

-- finish() returns rows only when something is wrong (failed or missing tests).
insert into pg_temp.results select * from finish();

select line from pg_temp.results;
rollback;
