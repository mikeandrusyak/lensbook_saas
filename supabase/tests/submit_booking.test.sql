begin;
select plan(21);

-- The SQL Editor shows only the last result set, so every assertion is stored here
-- and printed together at the end. The table lives in this transaction only.
create temp table results (line text);
grant all on pg_temp.results to anon, authenticated;

-- Fictional photographers A and B. The sign-up trigger creates their profiles
-- and seeds 3 active packages for each.
insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-00000000000a', 'authenticated', 'authenticated', 'a@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'authenticated', 'authenticated', 'b@example.test');

-- Three clients and projects for A, each with its own test token (plain text here;
-- the database stores only the SHA-256 hash, like lib/tokens.ts does).
insert into public.clients (id, photographer_id, names, email) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'Anna & Ben', 'anna.ben@example.test'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000a', 'Carla & Dan', 'carla.dan@example.test'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-00000000000a', 'Eva & Finn', 'eva.finn@example.test');

insert into public.projects (id, photographer_id, client_id, event_date, location, access_token_hash) values
  ('00000000-0000-0000-0000-000000000a11', '00000000-0000-0000-0000-00000000000a',
   '00000000-0000-0000-0000-0000000000a1', '2027-05-15', 'A venue', sha256(convert_to('token-1', 'UTF8'))),
  ('00000000-0000-0000-0000-000000000a12', '00000000-0000-0000-0000-00000000000a',
   '00000000-0000-0000-0000-0000000000a2', '2027-06-15', 'A venue 2', sha256(convert_to('token-2', 'UTF8'))),
  ('00000000-0000-0000-0000-000000000a13', '00000000-0000-0000-0000-00000000000a',
   '00000000-0000-0000-0000-0000000000a3', '2027-07-15', 'A venue 3', sha256(convert_to('token-3-old', 'UTF8')));

-- Package ids are looked up here, as the table owner, because anon cannot read packages.
-- ok_pkg and other_pkg: two active packages of A. hidden_pkg: a hidden package of A.
-- b_pkg: a package of photographer B.
create temp table ids as
  select
    (select id from public.packages where photographer_id = '00000000-0000-0000-0000-00000000000a'
     order by created_at, id limit 1 offset 0) as ok_pkg,
    (select id from public.packages where photographer_id = '00000000-0000-0000-0000-00000000000a'
     order by created_at, id limit 1 offset 1) as other_pkg,
    (select id from public.packages where photographer_id = '00000000-0000-0000-0000-00000000000a'
     order by created_at, id limit 1 offset 2) as hidden_pkg,
    (select id from public.packages where photographer_id = '00000000-0000-0000-0000-00000000000b'
     order by created_at, id limit 1) as b_pkg;
grant select on pg_temp.ids to anon;
update public.packages set is_active = false where id = (select hidden_pkg from pg_temp.ids);

-- 1. The function exists with the expected signature
insert into pg_temp.results select has_function(
  'public', 'submit_booking', array['text', 'uuid', 'text', 'boolean', 'text', 'text'],
  'submit_booking(token, package_id, signer_name, consent, names, location) exists'
);

-- 2. security definer, because anon may not write to contracts
insert into pg_temp.results select is(
  (select prosecdef from pg_proc
   where oid = 'public.submit_booking(text,uuid,text,boolean,text,text)'::regprocedure),
  true,
  'submit_booking is security definer'
);

-- 3. Empty search_path
insert into pg_temp.results select is(
  (select proconfig from pg_proc
   where oid = 'public.submit_booking(text,uuid,text,boolean,text,text)'::regprocedure),
  array['search_path=""'],
  'submit_booking has an empty search_path'
);

-- 4. anon (the couple) may call it
insert into pg_temp.results select ok(
  has_function_privilege('anon', 'public.submit_booking(text,uuid,text,boolean,text,text)', 'execute'),
  'anon can execute submit_booking'
);

-- From here on we act as anon, like the public booking page does.
set local role anon;

-- 5. A valid booking is accepted
insert into pg_temp.results select is(
  public.submit_booking('token-1', (select ok_pkg from pg_temp.ids), 'Anna Muster', true,
                        'Anna M. & Ben M.', 'Lake venue'),
  true,
  'a valid booking returns true'
);

reset role;

-- 6. Exactly one contract exists for the project, owned by A
insert into pg_temp.results select is(
  (select count(*) from public.contracts
   where project_id = '00000000-0000-0000-0000-000000000a11'
     and photographer_id = '00000000-0000-0000-0000-00000000000a'),
  1::bigint,
  'one contract exists for the project'
);

-- 7. It stores the typed signature and a snapshot of the chosen package
insert into pg_temp.results select is(
  (select signer_name || '|' || (package_snapshot ->> 'name') from public.contracts
   where project_id = '00000000-0000-0000-0000-000000000a11'),
  'Anna Muster|' || (select name from public.packages where id = (select ok_pkg from pg_temp.ids)),
  'the contract keeps the signature and the package snapshot'
);

-- 8. The names and location the couple entered are saved on their client and project
insert into pg_temp.results select is(
  (select c.names || '|' || p.location from public.projects p
   join public.clients c on c.id = p.client_id
   where p.id = '00000000-0000-0000-0000-000000000a11'),
  'Anna M. & Ben M.|Lake venue',
  'names and location are updated'
);

-- Resubmitting (double click, back button) with different values.
set local role anon;

-- 9. The repeated call is accepted, the page can show "thank you" again
insert into pg_temp.results select is(
  public.submit_booking('token-1', (select other_pkg from pg_temp.ids), 'Somebody Else', true,
                        'Changed Names', 'Changed place'),
  true,
  'resubmitting returns true'
);

reset role;

-- 10. Still one contract, and the first signature is unchanged
insert into pg_temp.results select is(
  (select count(*)::text || '|' || min(signer_name) from public.contracts
   where project_id = '00000000-0000-0000-0000-000000000a11'),
  '1|Anna Muster',
  'resubmitting does not duplicate or overwrite the contract'
);

-- Project 2: every invalid call returns false and writes nothing.
set local role anon;

-- 11. Unknown token
insert into pg_temp.results select is(
  public.submit_booking('no-such-token', (select ok_pkg from pg_temp.ids), 'Carla Muster', true, null, null),
  false,
  'unknown token returns false'
);

-- 12. A package of another photographer
insert into pg_temp.results select is(
  public.submit_booking('token-2', (select b_pkg from pg_temp.ids), 'Carla Muster', true, null, null),
  false,
  'a package of another photographer returns false'
);

-- 13. A hidden package
insert into pg_temp.results select is(
  public.submit_booking('token-2', (select hidden_pkg from pg_temp.ids), 'Carla Muster', true, null, null),
  false,
  'a hidden package returns false'
);

-- 14. No consent
insert into pg_temp.results select is(
  public.submit_booking('token-2', (select ok_pkg from pg_temp.ids), 'Carla Muster', false, null, null),
  false,
  'no consent returns false'
);

-- 15. Blank signature
insert into pg_temp.results select is(
  public.submit_booking('token-2', (select ok_pkg from pg_temp.ids), '   ', true, null, null),
  false,
  'a blank signature returns false'
);

-- 16. Oversized signature (limit is 200 characters)
insert into pg_temp.results select is(
  public.submit_booking('token-2', (select ok_pkg from pg_temp.ids), repeat('x', 201), true, null, null),
  false,
  'a signature over 200 characters returns false'
);

reset role;

-- 17. None of the invalid calls created a contract
insert into pg_temp.results select is(
  (select count(*) from public.contracts where project_id = '00000000-0000-0000-0000-000000000a12'),
  0::bigint,
  'invalid calls write nothing'
);

-- 18.-19. A name with HTML tags is accepted and stored as plain text (React escapes it on output).
set local role anon;
insert into pg_temp.results select is(
  public.submit_booking('token-2', (select ok_pkg from pg_temp.ids), '<script>alert(1)</script>', true, null, null),
  true,
  'a signature with HTML tags is accepted as plain text'
);
reset role;

insert into pg_temp.results select is(
  (select signer_name from public.contracts where project_id = '00000000-0000-0000-0000-000000000a12'),
  '<script>alert(1)</script>',
  'the HTML tags are stored literally, not altered or executed'
);

-- "New link" replaces the hash of project 3.
update public.projects
set access_token_hash = sha256(convert_to('token-3-new', 'UTF8'))
where id = '00000000-0000-0000-0000-000000000a13';

set local role anon;

-- 20. The replaced token no longer signs anything
insert into pg_temp.results select is(
  public.submit_booking('token-3-old', (select ok_pkg from pg_temp.ids), 'Eva Muster', true, null, null),
  false,
  'after "New link" the old token returns false'
);

-- 21. anon cannot write to contracts directly (no table privilege)
insert into pg_temp.results select throws_ok(
  $$insert into public.contracts (photographer_id, project_id, package_id, package_snapshot, signer_name)
    values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000a13',
            (select ok_pkg from pg_temp.ids), '{"name": "x"}', 'Eva Muster')$$,
  '42501',
  'permission denied for table contracts',
  'anon cannot insert into contracts directly'
);

-- finish() returns rows only when something is wrong (failed or missing tests).
reset role;
insert into pg_temp.results select * from finish();

select line from pg_temp.results;
rollback;
