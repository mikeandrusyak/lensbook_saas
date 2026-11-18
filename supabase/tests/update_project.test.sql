begin;
select plan(15);

-- The SQL Editor shows only the last result set, so every assertion is stored here
-- and printed together at the end. The table lives in this transaction only.
create temp table results (line text);
grant all on pg_temp.results to authenticated;

-- Fictional photographers A and B. The sign-up trigger creates their profiles.
insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-00000000000a', 'authenticated', 'authenticated', 'a@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'authenticated', 'authenticated', 'b@example.test');

-- One client and project for A. Runs as the table owner, so RLS does not apply.
insert into public.clients (id, photographer_id, names, email) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a',
   'Anna & Ben', 'anna.ben@example.test');

insert into public.projects (id, photographer_id, client_id, event_date, location) values
  ('00000000-0000-0000-0000-000000000a11', '00000000-0000-0000-0000-00000000000a',
   '00000000-0000-0000-0000-0000000000a1', '2027-05-15', 'A venue');

-- A new project starts as inquiry; move it one step so we can check that editing keeps the status.
update public.projects set status = 'consultation'
where id = '00000000-0000-0000-0000-000000000a11';

-- 1. The function exists with the expected signature
insert into pg_temp.results select has_function(
  'public', 'update_project', array['uuid', 'text', 'text', 'date', 'text'],
  'update_project(project_id, names, email, event_date, location) exists'
);

-- 2. It runs with the rights of the caller, so RLS applies (no security definer)
insert into pg_temp.results select is(
  (select prosecdef from pg_proc
   where oid = 'public.update_project(uuid,text,text,date,text)'::regprocedure),
  false,
  'update_project is security invoker'
);

-- 3. Empty search_path (no hijacking through other schemas)
insert into pg_temp.results select is(
  (select proconfig from pg_proc
   where oid = 'public.update_project(uuid,text,text,date,text)'::regprocedure),
  array['search_path=""'],
  'update_project has an empty search_path'
);

-- 4.-5. anon cannot call it, authenticated can
insert into pg_temp.results select ok(
  not has_function_privilege('anon', 'public.update_project(uuid,text,text,date,text)', 'execute'),
  'anon cannot execute update_project'
);

insert into pg_temp.results select ok(
  has_function_privilege('authenticated', 'public.update_project(uuid,text,text,date,text)', 'execute'),
  'authenticated can execute update_project'
);

-- From here on we act as photographer A.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a"}', true);

-- 6. A edits their own project
insert into pg_temp.results select lives_ok(
  $$select public.update_project('00000000-0000-0000-0000-000000000a11',
      'Anna & Ben Updated', 'anna.updated@example.test', '2027-07-01', 'New venue')$$,
  'A can edit their own project and client'
);

-- 7. The project fields changed
insert into pg_temp.results select is(
  (select count(*) from public.projects
   where id = '00000000-0000-0000-0000-000000000a11'
     and event_date = '2027-07-01' and location = 'New venue'),
  1::bigint,
  'event date and location of the project were updated'
);

-- 8. The client fields changed
insert into pg_temp.results select is(
  (select count(*) from public.clients
   where id = '00000000-0000-0000-0000-0000000000a1'
     and names = 'Anna & Ben Updated' and email = 'anna.updated@example.test'),
  1::bigint,
  'names and email of the client were updated'
);

-- 9. Editing does not touch the status
insert into pg_temp.results select is(
  (select status::text from public.projects
   where id = '00000000-0000-0000-0000-000000000a11'),
  'consultation',
  'the status did not change'
);

-- 10.-11. Date and location are optional and can be cleared
insert into pg_temp.results select lives_ok(
  $$select public.update_project('00000000-0000-0000-0000-000000000a11',
      'Anna & Ben Updated', 'anna.updated@example.test', null, null)$$,
  'A can clear date and location'
);

insert into pg_temp.results select is(
  (select count(*) from public.projects
   where id = '00000000-0000-0000-0000-000000000a11'
     and event_date is null and location is null),
  1::bigint,
  'date and location are empty after clearing'
);

-- From here on we act as photographer B.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000b"}', true);

-- 12. B cannot edit the project of A: RLS hides the row, so the function finds nothing
insert into pg_temp.results select throws_ok(
  $$select public.update_project('00000000-0000-0000-0000-000000000a11',
      'Hacked', 'hacked@example.test', '2030-01-01', 'Hacked venue')$$,
  'P0002',
  null,
  'B cannot edit the project of A'
);

-- 13. The data of A is unchanged. Back to the table owner to look at the raw rows.
reset role;
insert into pg_temp.results select is(
  (select count(*) from public.clients
   where id = '00000000-0000-0000-0000-0000000000a1'
     and names = 'Anna & Ben Updated' and email = 'anna.updated@example.test')
  + (select count(*) from public.projects
     where id = '00000000-0000-0000-0000-000000000a11'
       and event_date is null and location is null),
  2::bigint,
  'the rows of A are unchanged after the attempt of B'
);

-- 14. An id that does not exist gives the same error as someone else's id,
-- so the error does not reveal whether a project exists.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a"}', true);
insert into pg_temp.results select throws_ok(
  $$select public.update_project('00000000-0000-0000-0000-00000000dead',
      'Nobody', 'nobody@example.test', null, null)$$,
  'P0002',
  null,
  'a project that does not exist gives the same error'
);

-- 15. Date and location can be left out of the call altogether (they default to null).
insert into pg_temp.results select lives_ok(
  $$select public.update_project(p_project_id := '00000000-0000-0000-0000-000000000a11',
      p_names := 'Anna & Ben Again', p_email := 'anna.again@example.test')$$,
  'update_project can be called without date and location'
);

-- finish() returns rows only when something is wrong (failed or missing tests).
reset role;
insert into pg_temp.results select * from finish();

select line from pg_temp.results;
rollback;
