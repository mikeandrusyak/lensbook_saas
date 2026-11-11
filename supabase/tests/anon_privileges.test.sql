begin;
select plan(7);

-- The SQL Editor shows only the last result set, so every assertion is stored here
-- and printed together at the end. The table lives in this transaction only.
-- Schema-wide checks: they look at every object in public, so a table or function
-- added later without the right protection makes this test red.
-- Each check returns the names of the offending objects (empty = good), so a
-- failure shows directly what is wrong.
create temp table results (line text);

-- 1. public has exactly the tables we know about. A new table must be added
-- here on purpose, which is the reminder to write its RLS test.
insert into pg_temp.results select tables_are(
  'public',
  array['profiles', 'clients', 'projects', 'packages', 'contracts'],
  'public has exactly the five known tables'
);

-- 2. RLS is enabled on every table in public
insert into pg_temp.results select is(
  array(select c.relname from pg_class c
        where c.relnamespace = 'public'::regnamespace
          and c.relkind in ('r', 'p')
          and not c.relrowsecurity
        order by 1),
  '{}'::name[],
  'every table in public has RLS enabled'
);

-- 3. Every table in public has at least one policy (RLS without a policy
-- silently blocks everything, which usually means a forgotten policy)
insert into pg_temp.results select is(
  array(select c.relname from pg_class c
        where c.relnamespace = 'public'::regnamespace
          and c.relkind in ('r', 'p')
          and not exists (select 1 from pg_policies p
                          where p.schemaname = 'public' and p.tablename = c.relname)
        order by 1),
  '{}'::name[],
  'every table in public has at least one policy'
);

-- 4. anon has no privilege at all on any table or view in public
insert into pg_temp.results select is(
  array(select c.relname from pg_class c
        where c.relnamespace = 'public'::regnamespace
          and c.relkind in ('r', 'p', 'v', 'm', 'f')
          and has_table_privilege('anon', c.oid,
                'select, insert, update, delete, truncate, references, trigger')
        order by 1),
  '{}'::name[],
  'anon has no privilege on any table or view in public'
);

-- 5. anon has no privilege on any sequence in public (we use uuid keys, so there
-- should be none, but a later serial column would bring one)
insert into pg_temp.results select is(
  array(select c.relname from pg_class c
        where c.relnamespace = 'public'::regnamespace
          and case when c.relkind = 'S'
                   then has_sequence_privilege('anon', c.oid, 'usage, select, update')
                   else false end
        order by 1),
  '{}'::name[],
  'anon has no privilege on any sequence in public'
);

-- 6. anon can execute no function in public. The only planned exceptions are the
-- booking functions of Phase 6, which anon must be able to call.
insert into pg_temp.results select is(
  array(select p.proname from pg_proc p
        where p.pronamespace = 'public'::regnamespace
          and has_function_privilege('anon', p.oid, 'execute')
          and p.proname not in ('get_booking', 'submit_booking')
        order by 1),
  '{}'::name[],
  'anon can execute no function in public except the booking functions'
);

-- 7. authenticated can execute no security definer function in public (they
-- bypass RLS); again only the booking functions are allowed
insert into pg_temp.results select is(
  array(select p.proname from pg_proc p
        where p.pronamespace = 'public'::regnamespace
          and p.prosecdef
          and has_function_privilege('authenticated', p.oid, 'execute')
          and p.proname not in ('get_booking', 'submit_booking')
        order by 1),
  '{}'::name[],
  'authenticated can execute no security definer function in public except the booking functions'
);

-- finish() returns rows only when something is wrong (failed or missing tests).
insert into pg_temp.results select * from finish();

select line from pg_temp.results;
rollback;
