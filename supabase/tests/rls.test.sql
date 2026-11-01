-- Row-level security, ownership and username-policy tests. Any failed
-- assertion raises and aborts the run (psql ON_ERROR_STOP).
\set ON_ERROR_STOP on

create function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid::text, true);
  execute 'set local role authenticated';
end $$;

create function pg_temp.assert(cond boolean, msg text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'FAIL: %', msg; end if;
  raise notice 'ok   - %', msg;
end $$;

-- Run a statement as the current role and expect it to fail with the given SQLSTATE.
create function pg_temp.expect_error(stmt text, state text, msg text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if sqlstate = state then raise notice 'ok   - %', msg; return; end if;
    raise exception 'FAIL: % (expected %, got % %)', msg, state, sqlstate, sqlerrm;
  end;
  raise exception 'FAIL: % (statement succeeded)', msg;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.com', '{"username":"Alice_1"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@example.com', '{"username":"bob"}'),
  ('cccccccc-0000-0000-0000-000000000003', 'c@example.com', '{"username":"alice_1"}'),  -- taken (case-insensitive)
  ('dddddddd-0000-0000-0000-000000000004', 'd@example.com', '{"username":"x!"}'),       -- invalid
  ('eeeeeeee-0000-0000-0000-000000000005', 'e@example.com', '{}');                       -- missing

-- Signup trigger -------------------------------------------------------------
select pg_temp.assert((select count(*) from public.profiles) = 5, 'signup creates a profile per user');
select pg_temp.assert((select count(*) from public.user_preferences) = 5, 'signup creates preferences per user');
select pg_temp.assert((select username from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001') = 'Alice_1', 'requested username is kept');
select pg_temp.assert((select username from public.profiles where id = 'cccccccc-0000-0000-0000-000000000003') like 'user\_%', 'taken username falls back to generated');
select pg_temp.assert((select username from public.profiles where id = 'dddddddd-0000-0000-0000-000000000004') like 'user\_%', 'invalid username falls back to generated');
select pg_temp.assert((select username from public.profiles where id = 'eeeeeeee-0000-0000-0000-000000000005') like 'user\_%', 'missing username falls back to generated');

begin;
  -- Read isolation -----------------------------------------------------------
  select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
  select pg_temp.assert((select count(*) from public.profiles) = 1, 'A sees only their own profile');
  select pg_temp.assert((select id from public.profiles) = 'aaaaaaaa-0000-0000-0000-000000000001', 'A sees their own row');
  select pg_temp.assert((select count(*) from public.user_preferences) = 1, 'A sees only their own preferences');

  -- Write isolation ----------------------------------------------------------
  with u as (update public.profiles set display_name = 'Hacked' where id = 'bbbbbbbb-0000-0000-0000-000000000002' returning 1)
    select pg_temp.assert((select count(*) from u) = 0, 'A cannot update B''s profile');
  with u as (update public.user_preferences set default_market = 'US' where user_id = 'bbbbbbbb-0000-0000-0000-000000000002' returning 1)
    select pg_temp.assert((select count(*) from u) = 0, 'A cannot update B''s preferences');
  with u as (update public.profiles set display_name = 'Alice' where id = 'aaaaaaaa-0000-0000-0000-000000000001' returning 1)
    select pg_temp.assert((select count(*) from u) = 1, 'A can update their own display name');
  with u as (update public.user_preferences set default_market = 'CA', default_comparison_range = '5Y' where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' returning 1)
    select pg_temp.assert((select count(*) from u) = 1, 'A can update their own preferences');

  -- Ownership cannot be forged ----------------------------------------------
  select pg_temp.expect_error($$update public.profiles set id = 'bbbbbbbb-0000-0000-0000-000000000002' where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, '42501', 'cannot reassign profile id');
  select pg_temp.expect_error($$update public.user_preferences set user_id = 'bbbbbbbb-0000-0000-0000-000000000002' where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, '42501', 'cannot reassign preferences owner');
  select pg_temp.expect_error($$update public.profiles set username_changed_at = null where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, '42501', 'cannot edit username_changed_at directly');
  select pg_temp.expect_error($$insert into public.profiles (id, username) values (gen_random_uuid(), 'forged')$$, '42501', 'cannot insert profiles');
  select pg_temp.expect_error($$delete from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, '42501', 'cannot delete profiles');
  select pg_temp.expect_error($$insert into public.user_preferences (user_id) values (gen_random_uuid())$$, '42501', 'cannot insert preferences');
  select pg_temp.expect_error($$update public.user_preferences set default_market = 'EU' where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, '23514', 'invalid preference value rejected');
  select pg_temp.expect_error($$select public.handle_new_user()$$, '42501', 'signup trigger function is not callable by clients');
rollback;

-- Username policy ----------------------------------------------------------------
begin;
  select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
  select pg_temp.expect_error($$update public.profiles set username = 'bob'$$, '23505', 'duplicate username rejected');
  select pg_temp.expect_error($$update public.profiles set username = 'BOB'$$, '23505', 'duplicate username rejected case-insensitively');
  select pg_temp.expect_error($$update public.profiles set username = 'no spaces'$$, '23514', 'invalid username format rejected');
  update public.profiles set username = 'alice_two';
  select pg_temp.assert((select username_changed_at is not null from public.profiles), 'first rename succeeds and is timestamped');
  select pg_temp.expect_error($$update public.profiles set username = 'alice_three'$$, 'P0001', 'second rename within 14 days is blocked');
  update public.profiles set display_name = 'Still Works';
  select pg_temp.assert((select username = 'alice_two' from public.profiles), 'non-username updates remain allowed during cooldown');
  reset role;
  -- Simulate time passing: the policy trigger (correctly) blocks timestamp edits, so pause it.
  alter table public.profiles disable trigger profiles_username_policy;
  update public.profiles set username_changed_at = now() - interval '15 days' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
  alter table public.profiles enable trigger profiles_username_policy;
  select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
  update public.profiles set username = 'alice_three';
  select pg_temp.assert((select username = 'alice_three' from public.profiles), 'rename allowed after 14 days');
rollback;

-- Anonymous access -----------------------------------------------------------------
begin;
  set local role anon;
  select pg_temp.expect_error($$select * from public.profiles$$, '42501', 'anon cannot read profiles');
  select pg_temp.expect_error($$select * from public.user_preferences$$, '42501', 'anon cannot read preferences');
  select pg_temp.assert(public.username_available('brand_new'), 'anon can check an available username');
  select pg_temp.assert(not public.username_available('ALICE_1'), 'username check is case-insensitive');
  select pg_temp.assert(not public.username_available('no'), 'username check rejects invalid format');
rollback;

-- Account deletion cascades -----------------------------------------------------------
delete from auth.users where id = 'bbbbbbbb-0000-0000-0000-000000000002';
select pg_temp.assert(not exists (select 1 from public.profiles where id = 'bbbbbbbb-0000-0000-0000-000000000002'), 'deleting a user removes their profile');
select pg_temp.assert(not exists (select 1 from public.user_preferences where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'), 'deleting a user removes their preferences');

\echo ALL DATABASE TESTS PASSED
