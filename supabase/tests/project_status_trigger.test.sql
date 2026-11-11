begin;
select plan(18);

-- The SQL Editor shows only the last result set, so every assertion is stored here
-- and printed together at the end. The table lives in this transaction only.
create temp table results (line text);
grant all on pg_temp.results to authenticated;

-- Fictional photographer A with a profile and one client.
insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-00000000000a', 'authenticated', 'authenticated', 'a@example.test');

-- Since step 2.6 the sign-up trigger already created the profiles, so only set the name.
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'Photographer A')
on conflict (id) do update set display_name = excluded.display_name;

insert into public.clients (id, photographer_id, names, email) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a',
   'Anna & Ben', 'anna.ben@example.test');

-- 1. The trigger exists on projects
insert into pg_temp.results select has_trigger(
  'public', 'projects', 'projects_status_transition',
  'projects has the status transition trigger'
);

-- From here on we act as photographer A, like the app does.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a"}', true);

-- 2. A new project cannot start in a later status (it would skip the chain)
insert into pg_temp.results select throws_ok(
  $$insert into public.projects (photographer_id, client_id, status)
    values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
            'retainer_paid')$$,
  '23514',
  'a new project must start with status inquiry',
  'a new project cannot start with status retainer_paid'
);

-- 3. A new project with the default status is accepted
insert into pg_temp.results select lives_ok(
  $$insert into public.projects (id, photographer_id, client_id)
    values ('00000000-0000-0000-0000-000000000a11', '00000000-0000-0000-0000-00000000000a',
            '00000000-0000-0000-0000-0000000000a1')$$,
  'a new project with the default status inquiry is accepted'
);

-- 4. Skipping a status is rejected: inquiry -> retainer_paid
insert into pg_temp.results select throws_ok(
  $$update public.projects set status = 'retainer_paid'
    where id = '00000000-0000-0000-0000-000000000a11'$$,
  '23514',
  'status can only move one step forward or back',
  'inquiry -> retainer_paid (skip) is rejected'
);

-- 5. One step forward: inquiry -> consultation
insert into pg_temp.results select lives_ok(
  $$update public.projects set status = 'consultation'
    where id = '00000000-0000-0000-0000-000000000a11'$$,
  'inquiry -> consultation (one step forward) is accepted'
);

-- 6. One step back: consultation -> inquiry
insert into pg_temp.results select lives_ok(
  $$update public.projects set status = 'inquiry'
    where id = '00000000-0000-0000-0000-000000000a11'$$,
  'consultation -> inquiry (one step back) is accepted'
);

-- 7. Updating other fields without touching the status is accepted
insert into pg_temp.results select lives_ok(
  $$update public.projects set location = 'New venue'
    where id = '00000000-0000-0000-0000-000000000a11'$$,
  'updating location without a status change is accepted'
);

-- 8. Setting the same status again is not a step and is accepted
insert into pg_temp.results select lives_ok(
  $$update public.projects set status = 'inquiry'
    where id = '00000000-0000-0000-0000-000000000a11'$$,
  'inquiry -> inquiry (no change) is accepted'
);

-- 9. Walk forward step by step up to awaiting_event
insert into pg_temp.results select lives_ok(
  $$update public.projects set status = 'consultation'
    where id = '00000000-0000-0000-0000-000000000a11'$$,
  'inquiry -> consultation is accepted'
);

insert into pg_temp.results select lives_ok(
  $$update public.projects set status = 'retainer_paid'
    where id = '00000000-0000-0000-0000-000000000a11'$$,
  'consultation -> retainer_paid is accepted'
);

insert into pg_temp.results select lives_ok(
  $$update public.projects set status = 'awaiting_event'
    where id = '00000000-0000-0000-0000-000000000a11'$$,
  'retainer_paid -> awaiting_event is accepted'
);

-- 10. Skipping back is rejected too: awaiting_event -> inquiry
insert into pg_temp.results select throws_ok(
  $$update public.projects set status = 'inquiry'
    where id = '00000000-0000-0000-0000-000000000a11'$$,
  '23514',
  'status can only move one step forward or back',
  'awaiting_event -> inquiry (skip back) is rejected'
);

-- 11. Gallery Delivered without a gallery link is rejected (check constraint)
insert into pg_temp.results select throws_ok(
  $$update public.projects set status = 'gallery_delivered'
    where id = '00000000-0000-0000-0000-000000000a11'$$,
  '23514',
  null,
  'gallery_delivered without gallery_url is rejected'
);

-- 12. Gallery Delivered with an https link in the same update is accepted
insert into pg_temp.results select lives_ok(
  $$update public.projects
      set status = 'gallery_delivered', gallery_url = 'https://gallery.example.test/a'
    where id = '00000000-0000-0000-0000-000000000a11'$$,
  'awaiting_event -> gallery_delivered with gallery_url is accepted'
);

-- 13. The link cannot be removed while the gallery is delivered
insert into pg_temp.results select throws_ok(
  $$update public.projects set gallery_url = null
    where id = '00000000-0000-0000-0000-000000000a11'$$,
  '23514',
  null,
  'gallery_url cannot be cleared in gallery_delivered'
);

-- 14. The status is still gallery_delivered after the failed attempts
insert into pg_temp.results select is(
  (select status::text from public.projects where id = '00000000-0000-0000-0000-000000000a11'),
  'gallery_delivered',
  'the project is in gallery_delivered'
);

-- 15. One step back from the last status: gallery_delivered -> awaiting_event
insert into pg_temp.results select lives_ok(
  $$update public.projects set status = 'awaiting_event'
    where id = '00000000-0000-0000-0000-000000000a11'$$,
  'gallery_delivered -> awaiting_event (one step back) is accepted'
);

-- 16. Outside gallery_delivered the link may be cleared again
insert into pg_temp.results select lives_ok(
  $$update public.projects set gallery_url = null
    where id = '00000000-0000-0000-0000-000000000a11'$$,
  'gallery_url can be cleared in awaiting_event'
);

reset role;

-- finish() returns rows only when something is wrong (failed or missing tests).
insert into pg_temp.results select * from finish();

select line from pg_temp.results;
rollback;
