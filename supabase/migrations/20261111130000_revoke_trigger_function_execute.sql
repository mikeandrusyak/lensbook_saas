-- Found by supabase/tests/anon_privileges.test.sql (step 2.7): Supabase grants
-- execute on every new function in public to anon and authenticated, so the
-- status trigger function from step 2.4 was executable by them. Calling a trigger
-- function directly fails anyway, but the rule is "anon executes nothing except
-- the booking functions", so we close it. The trigger itself keeps working:
-- execute is checked when the trigger is created, not each time it fires.
revoke execute on function public.projects_check_status_transition()
  from public, anon, authenticated;
