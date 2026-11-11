begin;
select plan(12);

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

-- One fictional client per photographer. Runs as the table owner, so RLS does not apply.
insert into public.clients (id, photographer_id, names, email) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a',
   'Anna & Ben', 'anna.ben@example.test'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b',
   'Clara & David', 'clara.david@example.test');

-- 1. The status enum has exactly the 5 statuses, in this order (the trigger in 2.4 relies on it)
insert into pg_temp.results select enum_has_labels(
  'public', 'project_status',
  array['inquiry', 'consultation', 'retainer_paid', 'awaiting_event', 'gallery_delivered'],
  'project_status has the 5 statuses in order'
);

-- 2. RLS is enabled
insert into pg_temp.results select ok(
  (select relrowsecurity from pg_class where oid = 'public.clients'::regclass),
  'RLS is enabled on clients'
);

-- 3. anon has no privilege on the table
insert into pg_temp.results select ok(
  not has_table_privilege('anon', 'public.clients', 'select'),
  'anon has no select privilege on clients'
);

-- 4. Email is required (the only way to reach a client who lost their access)
insert into pg_temp.results select col_not_null(
  'public', 'clients', 'email',
  'clients.email is not null'
);

-- From here on we act as photographer A.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a"}', true);

-- 5. A sees exactly one client
insert into pg_temp.results select is(
  (select count(*) from public.clients),
  1::bigint,
  'A sees exactly one client'
);

-- 6. That client is not B's
insert into pg_temp.results select is(
  (select count(*) from public.clients where id = '00000000-0000-0000-0000-0000000000b1'),
  0::bigint,
  'A does not see the client of B'
);

-- 7. A can add a client for themselves
insert into pg_temp.results select lives_ok(
  $$insert into public.clients (id, photographer_id, names, email)
    values ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000a',
            'Eva & Felix', 'eva.felix@example.test')$$,
  'A can insert their own client'
);

-- 8. A cannot add a client in B's name (with check fails, 42501)
insert into pg_temp.results select throws_ok(
  $$insert into public.clients (photographer_id, names, email)
    values ('00000000-0000-0000-0000-00000000000b', 'fake', 'fake@example.test')$$,
  '42501',
  null,
  'A cannot insert a client for B'
);

-- 9. A cannot hand their own client over to B (with check on update, 42501)
insert into pg_temp.results select throws_ok(
  $$update public.clients set photographer_id = '00000000-0000-0000-0000-00000000000b'
    where id = '00000000-0000-0000-0000-0000000000a1'$$,
  '42501',
  null,
  'A cannot move their client to B'
);

-- 10. A can delete their own client
delete from public.clients where id = '00000000-0000-0000-0000-0000000000a2';

insert into pg_temp.results select is(
  (select count(*) from public.clients where id = '00000000-0000-0000-0000-0000000000a2'),
  0::bigint,
  'A can delete their own client'
);

-- A tries to change and delete B's client. RLS hides the row, so both change nothing;
-- we check as the table owner (reset role), because A cannot see B's rows.
update public.clients set names = 'hacked'
where id = '00000000-0000-0000-0000-0000000000b1';

delete from public.clients where id = '00000000-0000-0000-0000-0000000000b1';

reset role;

-- 11. B's client still exists
insert into pg_temp.results select is(
  (select count(*) from public.clients where id = '00000000-0000-0000-0000-0000000000b1'),
  1::bigint,
  'A cannot delete the client of B'
);

-- 12. B's client is unchanged
insert into pg_temp.results select is(
  (select names from public.clients where id = '00000000-0000-0000-0000-0000000000b1'),
  'Clara & David',
  'A cannot update the client of B'
);

-- finish() returns rows only when something is wrong (failed or missing tests).
insert into pg_temp.results select * from finish();

select line from pg_temp.results;
rollback;
