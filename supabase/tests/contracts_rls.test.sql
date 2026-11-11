begin;
select plan(16);

-- The SQL Editor shows only the last result set, so every assertion is stored here
-- and printed together at the end. The table lives in this transaction only.
create temp table results (line text);
grant all on pg_temp.results to authenticated;

-- Fictional photographers A and B, each with a profile, a client, a package and a project.
insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-00000000000a', 'authenticated', 'authenticated', 'a@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'authenticated', 'authenticated', 'b@example.test');

insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'Photographer A'),
  ('00000000-0000-0000-0000-00000000000b', 'Photographer B');

insert into public.clients (id, photographer_id, names, email) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a',
   'Anna & Ben', 'anna.ben@example.test'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b',
   'Clara & David', 'clara.david@example.test');

insert into public.packages (id, photographer_id, name, price, duration_hours) values
  ('00000000-0000-0000-0000-00000000a0a1', '00000000-0000-0000-0000-00000000000a',
   'Basic', 1200.00, 3),
  ('00000000-0000-0000-0000-00000000b0b1', '00000000-0000-0000-0000-00000000000b',
   'Full day', 3500.00, 10);

insert into public.projects (id, photographer_id, client_id) values
  ('00000000-0000-0000-0000-000000000a11', '00000000-0000-0000-0000-00000000000a',
   '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-000000000a12', '00000000-0000-0000-0000-00000000000a',
   '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-000000000b11', '00000000-0000-0000-0000-00000000000b',
   '00000000-0000-0000-0000-0000000000b1');

-- One signed contract per photographer. In the app only submit_booking (step 6)
-- creates contracts; here we run as the table owner, so RLS does not apply.
insert into public.contracts (id, photographer_id, project_id, package_id, package_snapshot, signer_name) values
  ('00000000-0000-0000-0000-0000000c0a11', '00000000-0000-0000-0000-00000000000a',
   '00000000-0000-0000-0000-000000000a11', '00000000-0000-0000-0000-00000000a0a1',
   '{"name": "Basic", "price": 1200.00, "duration_hours": 3}', 'Anna Example'),
  ('00000000-0000-0000-0000-0000000c0b11', '00000000-0000-0000-0000-00000000000b',
   '00000000-0000-0000-0000-000000000b11', '00000000-0000-0000-0000-00000000b0b1',
   '{"name": "Full day", "price": 3500.00, "duration_hours": 10}', 'Clara Example');

-- 1. RLS is enabled
insert into pg_temp.results select ok(
  (select relrowsecurity from pg_class where oid = 'public.contracts'::regclass),
  'RLS is enabled on contracts'
);

-- 2. anon has no privilege on the table
insert into pg_temp.results select ok(
  not has_table_privilege('anon', 'public.contracts', 'select'),
  'anon has no select privilege on contracts'
);

-- 3.-5. The app may only read contracts; writing goes through submit_booking
insert into pg_temp.results select ok(
  not has_table_privilege('authenticated', 'public.contracts', 'insert'),
  'authenticated has no insert privilege on contracts'
);

insert into pg_temp.results select ok(
  not has_table_privilege('authenticated', 'public.contracts', 'update'),
  'authenticated has no update privilege on contracts'
);

insert into pg_temp.results select ok(
  not has_table_privilege('authenticated', 'public.contracts', 'delete'),
  'authenticated has no delete privilege on contracts'
);

-- 6. A second contract for the same project is rejected (unique, 23505)
insert into pg_temp.results select throws_ok(
  $$insert into public.contracts (photographer_id, project_id, package_id, package_snapshot, signer_name)
    values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000a11',
            '00000000-0000-0000-0000-00000000a0a1', '{"name": "Basic"}', 'Anna Example')$$,
  '23505',
  null,
  'a second contract for the same project is rejected'
);

-- 7. A contract on A's project with B's package is rejected (composite foreign key, 23503)
insert into pg_temp.results select throws_ok(
  $$insert into public.contracts (photographer_id, project_id, package_id, package_snapshot, signer_name)
    values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000a12',
            '00000000-0000-0000-0000-00000000b0b1', '{"name": "Full day"}', 'Anna Example')$$,
  '23503',
  null,
  'a contract cannot use the package of another photographer'
);

-- 8. A contract in A's name on B's project is rejected (composite foreign key, 23503)
insert into pg_temp.results select throws_ok(
  $$insert into public.contracts (photographer_id, project_id, package_id, package_snapshot, signer_name)
    values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000b11',
            '00000000-0000-0000-0000-00000000a0a1', '{"name": "Basic"}', 'Anna Example')$$,
  '23503',
  null,
  'a contract cannot point to the project of another photographer'
);

-- 9. An empty signature is rejected (check constraint, 23514)
insert into pg_temp.results select throws_ok(
  $$insert into public.contracts (photographer_id, project_id, package_id, package_snapshot, signer_name)
    values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000a12',
            '00000000-0000-0000-0000-00000000a0a1', '{"name": "Basic"}', '   ')$$,
  '23514',
  null,
  'an empty signer_name is rejected'
);

-- 10. The package snapshot must be a JSON object (check constraint, 23514)
insert into pg_temp.results select throws_ok(
  $$insert into public.contracts (photographer_id, project_id, package_id, package_snapshot, signer_name)
    values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000a12',
            '00000000-0000-0000-0000-00000000a0a1', '"Basic"', 'Anna Example')$$,
  '23514',
  null,
  'a package_snapshot that is not a JSON object is rejected'
);

-- From here on we act as photographer A.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a"}', true);

-- 11. A sees exactly one contract
insert into pg_temp.results select is(
  (select count(*) from public.contracts),
  1::bigint,
  'A sees exactly one contract'
);

-- 12. A does not see B's contract
insert into pg_temp.results select is(
  (select count(*) from public.contracts where id = '00000000-0000-0000-0000-0000000c0b11'),
  0::bigint,
  'A does not see the contract of B'
);

-- 13. A cannot create a contract directly (no insert privilege, 42501)
insert into pg_temp.results select throws_ok(
  $$insert into public.contracts (photographer_id, project_id, package_id, package_snapshot, signer_name)
    values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000a12',
            '00000000-0000-0000-0000-00000000a0a1', '{"name": "Basic"}', 'Forged')$$,
  '42501',
  null,
  'A cannot insert a contract directly'
);

-- 14. A cannot change their own signed contract (no update privilege, 42501)
insert into pg_temp.results select throws_ok(
  $$update public.contracts set signer_name = 'Forged'
    where id = '00000000-0000-0000-0000-0000000c0a11'$$,
  '42501',
  null,
  'A cannot update their own contract'
);

-- 15. Deleting a project removes its contract (on delete cascade)
insert into pg_temp.results select lives_ok(
  $$delete from public.projects where id = '00000000-0000-0000-0000-000000000a11'$$,
  'A can delete a project that has a contract'
);

reset role;

-- 16. The contract of the deleted project is gone
insert into pg_temp.results select is(
  (select count(*) from public.contracts where id = '00000000-0000-0000-0000-0000000c0a11'),
  0::bigint,
  'the contract is deleted together with its project'
);

-- finish() returns rows only when something is wrong (failed or missing tests).
insert into pg_temp.results select * from finish();

select line from pg_temp.results;
rollback;
