begin;
select plan(17);

-- The SQL Editor shows only the last result set, so every assertion is stored here
-- and printed together at the end. The table lives in this transaction only.
create temp table results (line text);
grant all on pg_temp.results to authenticated;

-- Fictional photographers A and B, each with a profile and one client.
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

-- One project per photographer. Runs as the table owner, so RLS does not apply.
insert into public.projects (id, photographer_id, client_id, event_date, location) values
  ('00000000-0000-0000-0000-000000000a11', '00000000-0000-0000-0000-00000000000a',
   '00000000-0000-0000-0000-0000000000a1', '2027-05-15', 'A venue'),
  ('00000000-0000-0000-0000-000000000b11', '00000000-0000-0000-0000-00000000000b',
   '00000000-0000-0000-0000-0000000000b1', '2027-06-12', 'B venue');

-- 1. RLS is enabled
insert into pg_temp.results select ok(
  (select relrowsecurity from pg_class where oid = 'public.projects'::regclass),
  'RLS is enabled on projects'
);

-- 2. anon has no privilege on the table
insert into pg_temp.results select ok(
  not has_table_privilege('anon', 'public.projects', 'select'),
  'anon has no select privilege on projects'
);

-- 3. event_date is indexed (statuses and lists are driven by it)
insert into pg_temp.results select ok(
  exists (select 1 from pg_indexes
          where schemaname = 'public' and tablename = 'projects'
            and indexname = 'projects_event_date_idx'),
  'projects.event_date has an index'
);

-- From here on we act as photographer A.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a"}', true);

-- 4. A sees exactly one project
insert into pg_temp.results select is(
  (select count(*) from public.projects),
  1::bigint,
  'A sees exactly one project'
);

-- 5. That project is not B's
insert into pg_temp.results select is(
  (select count(*) from public.projects where id = '00000000-0000-0000-0000-000000000b11'),
  0::bigint,
  'A does not see the project of B'
);

-- 6. A can add a project with their own client; date and location are optional
insert into pg_temp.results select lives_ok(
  $$insert into public.projects (id, photographer_id, client_id)
    values ('00000000-0000-0000-0000-000000000a12', '00000000-0000-0000-0000-00000000000a',
            '00000000-0000-0000-0000-0000000000a1')$$,
  'A can insert a project with their own client, without date and location'
);

-- 7. A new project starts as inquiry
insert into pg_temp.results select is(
  (select status::text from public.projects where id = '00000000-0000-0000-0000-000000000a12'),
  'inquiry',
  'a new project starts with status inquiry'
);

-- 8. A cannot add a project in B's name (RLS with check, 42501)
insert into pg_temp.results select throws_ok(
  $$insert into public.projects (photographer_id, client_id)
    values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1')$$,
  '42501',
  null,
  'A cannot insert a project for B'
);

-- 9. A cannot attach B's client to a new project (composite foreign key, 23503)
insert into pg_temp.results select throws_ok(
  $$insert into public.projects (photographer_id, client_id)
    values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000b1')$$,
  '23503',
  null,
  'A cannot insert a project with the client of B'
);

-- 10. A cannot switch their project to B's client (composite foreign key, 23503)
insert into pg_temp.results select throws_ok(
  $$update public.projects set client_id = '00000000-0000-0000-0000-0000000000b1'
    where id = '00000000-0000-0000-0000-000000000a11'$$,
  '23503',
  null,
  'A cannot move their project to the client of B'
);

-- 11. A gallery link without https is rejected (check constraint, 23514)
insert into pg_temp.results select throws_ok(
  $$update public.projects set gallery_url = 'http://gallery.example.test/a'
    where id = '00000000-0000-0000-0000-000000000a11'$$,
  '23514',
  null,
  'gallery_url with http:// is rejected'
);

-- 12. An https gallery link is accepted
insert into pg_temp.results select lives_ok(
  $$update public.projects set gallery_url = 'https://gallery.example.test/a'
    where id = '00000000-0000-0000-0000-000000000a11'$$,
  'gallery_url with https:// is accepted'
);

-- 13. The token hash must be exactly 32 bytes (a SHA-256 digest, check constraint, 23514)
insert into pg_temp.results select throws_ok(
  $$update public.projects set access_token_hash = '\x00'::bytea
    where id = '00000000-0000-0000-0000-000000000a11'$$,
  '23514',
  null,
  'access_token_hash that is not 32 bytes is rejected'
);

-- 14. A client who still has a project cannot be deleted (foreign key, 23503)
insert into pg_temp.results select throws_ok(
  $$delete from public.clients where id = '00000000-0000-0000-0000-0000000000a1'$$,
  '23503',
  null,
  'a client with a project cannot be deleted'
);

-- A tries to change and delete B's project. RLS hides the row, so both change nothing;
-- we check as the table owner (reset role), because A cannot see B's rows.
update public.projects set location = 'hacked'
where id = '00000000-0000-0000-0000-000000000b11';

delete from public.projects where id = '00000000-0000-0000-0000-000000000b11';

reset role;

-- 15. B's project still exists
insert into pg_temp.results select is(
  (select count(*) from public.projects where id = '00000000-0000-0000-0000-000000000b11'),
  1::bigint,
  'A cannot delete the project of B'
);

-- 16. B's project is unchanged
insert into pg_temp.results select is(
  (select location from public.projects where id = '00000000-0000-0000-0000-000000000b11'),
  'B venue',
  'A cannot update the project of B'
);

-- 17. Deleting a whole account still works: the user cascades to profile, clients and
-- projects, and the client foreign key (no action) is checked only at the end.
insert into pg_temp.results select lives_ok(
  $$delete from auth.users where id = '00000000-0000-0000-0000-00000000000b'$$,
  'deleting a photographer cascades through clients and projects'
);

-- finish() returns rows only when something is wrong (failed or missing tests).
insert into pg_temp.results select * from finish();

select line from pg_temp.results;
rollback;
