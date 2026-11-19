begin;
select plan(17);

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

-- The status trigger allows one step at a time, so walk to awaiting_event.
update public.projects set status = 'consultation'   where id = '00000000-0000-0000-0000-000000000a11';
update public.projects set status = 'retainer_paid'  where id = '00000000-0000-0000-0000-000000000a11';
update public.projects set status = 'awaiting_event' where id = '00000000-0000-0000-0000-000000000a11';

-- 1. The function exists with the expected signature
insert into pg_temp.results select has_function(
  'public', 'set_gallery_url', array['uuid', 'text'],
  'set_gallery_url(project_id, gallery_url) exists'
);

-- 2. It runs with the rights of the caller, so RLS applies (no security definer)
insert into pg_temp.results select is(
  (select prosecdef from pg_proc
   where oid = 'public.set_gallery_url(uuid,text)'::regprocedure),
  false,
  'set_gallery_url is security invoker'
);

-- 3. Empty search_path (no hijacking through other schemas)
insert into pg_temp.results select is(
  (select proconfig from pg_proc
   where oid = 'public.set_gallery_url(uuid,text)'::regprocedure),
  array['search_path=""'],
  'set_gallery_url has an empty search_path'
);

-- 4.-5. anon cannot call it, authenticated can
insert into pg_temp.results select ok(
  not has_function_privilege('anon', 'public.set_gallery_url(uuid,text)', 'execute'),
  'anon cannot execute set_gallery_url'
);

insert into pg_temp.results select ok(
  has_function_privilege('authenticated', 'public.set_gallery_url(uuid,text)', 'execute'),
  'authenticated can execute set_gallery_url'
);

-- From here on we act as photographer A.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a"}', true);

-- 6.-7. A sets an https link on their own project
insert into pg_temp.results select lives_ok(
  $$select public.set_gallery_url('00000000-0000-0000-0000-000000000a11',
      'https://gallery.example.test/anna-and-ben')$$,
  'A can set an https gallery link on their own project'
);

insert into pg_temp.results select is(
  (select gallery_url from public.projects
   where id = '00000000-0000-0000-0000-000000000a11'),
  'https://gallery.example.test/anna-and-ben',
  'the gallery link was saved'
);

-- 8. Setting the link does not change the status
insert into pg_temp.results select is(
  (select status::text from public.projects
   where id = '00000000-0000-0000-0000-000000000a11'),
  'awaiting_event',
  'the status did not change'
);

-- 9.-10. Only https:// is accepted (check constraint, error 23514)
insert into pg_temp.results select throws_ok(
  $$select public.set_gallery_url('00000000-0000-0000-0000-000000000a11',
      'http://gallery.example.test/anna-and-ben')$$,
  '23514',
  null,
  'an http:// link is rejected'
);

insert into pg_temp.results select throws_ok(
  $$select public.set_gallery_url('00000000-0000-0000-0000-000000000a11',
      'javascript:alert(1)')$$,
  '23514',
  null,
  'a javascript: link is rejected'
);

-- 11.-12. Before delivery the link can be cleared; the argument is optional (default null)
insert into pg_temp.results select lives_ok(
  $$select public.set_gallery_url(p_project_id := '00000000-0000-0000-0000-000000000a11')$$,
  'A can clear the link before Gallery Delivered'
);

insert into pg_temp.results select is(
  (select gallery_url from public.projects
   where id = '00000000-0000-0000-0000-000000000a11'),
  null,
  'the gallery link is empty after clearing'
);

-- From here on we act as photographer B.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000b"}', true);

-- 13. B cannot set a link on the project of A: RLS hides the row, so the function finds nothing
insert into pg_temp.results select throws_ok(
  $$select public.set_gallery_url('00000000-0000-0000-0000-000000000a11',
      'https://evil.example.test/')$$,
  'P0002',
  null,
  'B cannot set the gallery link of A'
);

-- 14. An id that does not exist gives the same error as someone else's id
insert into pg_temp.results select throws_ok(
  $$select public.set_gallery_url('00000000-0000-0000-0000-00000000dead',
      'https://gallery.example.test/')$$,
  'P0002',
  null,
  'a project that does not exist gives the same error'
);

-- 15. The row of A is unchanged after the attempt of B. Back to the table owner.
reset role;
insert into pg_temp.results select is(
  (select gallery_url from public.projects
   where id = '00000000-0000-0000-0000-000000000a11'),
  null,
  'the gallery link of A is unchanged after the attempt of B'
);

-- Set a link again and move the project to gallery_delivered (as the table owner).
update public.projects set gallery_url = 'https://gallery.example.test/anna-and-ben'
where id = '00000000-0000-0000-0000-000000000a11';
update public.projects set status = 'gallery_delivered'
where id = '00000000-0000-0000-0000-000000000a11';

-- 16.-17. In Gallery Delivered the link cannot be cleared, but it can be replaced
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a"}', true);

insert into pg_temp.results select throws_ok(
  $$select public.set_gallery_url('00000000-0000-0000-0000-000000000a11', null)$$,
  '23514',
  null,
  'the link cannot be cleared in Gallery Delivered'
);

insert into pg_temp.results select lives_ok(
  $$select public.set_gallery_url('00000000-0000-0000-0000-000000000a11',
      'https://gallery.example.test/anna-and-ben-v2')$$,
  'the link can be replaced in Gallery Delivered'
);

-- finish() returns rows only when something is wrong (failed or missing tests).
reset role;
insert into pg_temp.results select * from finish();

select line from pg_temp.results;
rollback;
