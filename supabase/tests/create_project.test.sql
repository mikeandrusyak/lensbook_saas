begin;
select plan(13);

-- The SQL Editor shows only the last result set, so every assertion is stored here
-- and printed together at the end. The table lives in this transaction only.
create temp table results (line text);
grant all on pg_temp.results to authenticated;

-- Fictional photographers A and B. The sign-up trigger creates their profiles.
insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-00000000000a', 'authenticated', 'authenticated', 'a@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'authenticated', 'authenticated', 'b@example.test');

-- 1. The function exists with the expected signature
insert into pg_temp.results select has_function(
  'public', 'create_project', array['text', 'text', 'date', 'text'],
  'create_project(names, email, event_date, location) exists'
);

-- 2. It runs with the rights of the caller, so RLS applies (no security definer)
insert into pg_temp.results select is(
  (select prosecdef from pg_proc
   where oid = 'public.create_project(text,text,date,text)'::regprocedure),
  false,
  'create_project is security invoker'
);

-- 3. Empty search_path (no hijacking through other schemas)
insert into pg_temp.results select is(
  (select proconfig from pg_proc
   where oid = 'public.create_project(text,text,date,text)'::regprocedure),
  array['search_path=""'],
  'create_project has an empty search_path'
);

-- 4.-5. anon cannot call it, authenticated can
insert into pg_temp.results select ok(
  not has_function_privilege('anon', 'public.create_project(text,text,date,text)', 'execute'),
  'anon cannot execute create_project'
);

insert into pg_temp.results select ok(
  has_function_privilege('authenticated', 'public.create_project(text,text,date,text)', 'execute'),
  'authenticated can execute create_project'
);

-- From here on we act as photographer A.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a"}', true);

-- 6. A creates a client and a project in one call
insert into pg_temp.results select lives_ok(
  $$select public.create_project('Anna & Ben Example', 'anna.ben@example.test', '2027-05-15', 'A venue')$$,
  'A can create a client and a project'
);

-- 7. The client belongs to A, although no photographer id was passed in
insert into pg_temp.results select is(
  (select count(*) from public.clients
   where names = 'Anna & Ben Example'
     and photographer_id = '00000000-0000-0000-0000-00000000000a'),
  1::bigint,
  'the new client belongs to A'
);

-- 8. The project belongs to A, starts as inquiry and carries the date and location
insert into pg_temp.results select is(
  (select count(*) from public.projects p
   join public.clients c on c.id = p.client_id
   where c.names = 'Anna & Ben Example'
     and p.photographer_id = '00000000-0000-0000-0000-00000000000a'
     and p.status = 'inquiry'
     and p.event_date = '2027-05-15'
     and p.location = 'A venue'),
  1::bigint,
  'the new project belongs to A, status inquiry, with date and location'
);

-- From here on we act as photographer B.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000b"}', true);

-- 9. B does not see what A created
insert into pg_temp.results select is(
  (select count(*) from public.projects where location = 'A venue')
    + (select count(*) from public.clients where names = 'Anna & Ben Example'),
  0::bigint,
  'B sees neither the client nor the project of A'
);

-- 10.-11. B creates their own; optional date and location may be empty
insert into pg_temp.results select lives_ok(
  $$select public.create_project('Clara & David Example', 'clara.david@example.test', null, null)$$,
  'B can create a project without date and location'
);

insert into pg_temp.results select is(
  (select count(*) from public.projects p
   join public.clients c on c.id = p.client_id
   where c.names = 'Clara & David Example'
     and p.photographer_id = '00000000-0000-0000-0000-00000000000b'
     and p.event_date is null and p.location is null),
  1::bigint,
  'the project of B belongs to B'
);

-- 12.-13. A failed call leaves nothing behind. The function body is one transaction,
-- so a failure in the second insert would also undo the first.
insert into pg_temp.results select throws_ok(
  $$select public.create_project(null, 'fail@example.test', null, null)$$,
  '23502',
  null,
  'missing names are rejected'
);

insert into pg_temp.results select is(
  (select count(*) from public.clients where email = 'fail@example.test'),
  0::bigint,
  'a failed call leaves no client behind'
);

-- finish() returns rows only when something is wrong (failed or missing tests).
insert into pg_temp.results select * from finish();

select line from pg_temp.results;
rollback;
