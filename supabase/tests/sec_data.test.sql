-- Access tests for the SEC data tables. Any failed assertion raises and aborts the run.
\set ON_ERROR_STOP on

create function pg_temp.assert(cond boolean, msg text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'FAIL: %', msg; end if;
  raise notice 'ok   - %', msg;
end $$;

create function pg_temp.expect_error(stmt text, state text, msg text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if sqlstate = state then raise notice 'ok   - %', msg; return; end if;
    raise exception 'FAIL: % (wrong error %: %)', msg, sqlstate, sqlerrm;
  end;
  raise exception 'FAIL: % (statement succeeded)', msg;
end $$;

-- Seed as the service role (bypasses RLS) -------------------------------------------------
begin;
  set local role service_role;
  insert into public.company_financials (cik, name, tickers, data, retrieved_at)
    values ('0000320193', 'Apple Inc.', '{AAPL}', '{"company":{"name":"Apple Inc."}}', now());
  insert into public.sec_company_list (entries, generated_at) values ('[[320193,"Apple Inc.","AAPL","Nasdaq"]]', now());
  insert into public.sync_requests (cik) values ('0001594805');
  select pg_temp.assert((select count(*) from public.company_financials) = 1, 'service role can write company financials');
  select pg_temp.assert((select count(*) from public.sync_requests) = 1, 'service role can use the request queue');
commit;

-- Visitors (anon) --------------------------------------------------------------------------
begin;
  set local role anon;
  select pg_temp.assert((select count(*) from public.company_financials) = 1, 'anon can read company financials');
  select pg_temp.assert((select name from public.company_financials) = 'Apple Inc.', 'anon reads the saved company');
  select pg_temp.assert((select count(*) from public.sec_company_list) = 1, 'anon can read the company list');
  select pg_temp.expect_error($$select * from public.sync_requests$$, '42501', 'anon cannot read the request queue');
  select pg_temp.expect_error($$insert into public.sync_requests (cik) values ('0000000001')$$, '42501', 'anon cannot add to the request queue');
  select pg_temp.expect_error($$insert into public.company_financials (cik, name, data, retrieved_at) values ('0000000002','X','{}', now())$$, '42501', 'anon cannot insert company financials');
  select pg_temp.expect_error($$update public.company_financials set name = 'Hacked'$$, '42501', 'anon cannot update company financials');
  select pg_temp.expect_error($$delete from public.company_financials$$, '42501', 'anon cannot delete company financials');
  select pg_temp.expect_error($$insert into public.sec_company_list (id, entries, generated_at) values (1, '[]', now())$$, '42501', 'anon cannot write the company list');
rollback;

-- Signed-in users have no extra power over this data ----------------------------------------
begin;
  set local role authenticated;
  select pg_temp.assert((select count(*) from public.company_financials) = 1, 'signed-in users can read company financials');
  select pg_temp.expect_error($$select * from public.sync_requests$$, '42501', 'signed-in users cannot read the request queue');
  select pg_temp.expect_error($$update public.company_financials set name = 'Hacked'$$, '42501', 'signed-in users cannot update company financials');
  select pg_temp.expect_error($$delete from public.sec_company_list$$, '42501', 'signed-in users cannot delete the company list');
rollback;

-- Data rules ---------------------------------------------------------------------------------
begin;
  set local role service_role;
  select pg_temp.expect_error($$insert into public.company_financials (cik, name, data, retrieved_at) values ('123','X','{}', now())$$, '23514', 'a CIK must be 10 digits');
  select pg_temp.expect_error($$insert into public.company_financials (cik, name, data, retrieved_at) values ('0000000003','X','[]', now())$$, '23514', 'data must be a JSON object');
  select pg_temp.expect_error($$insert into public.company_financials (cik, name, data, retrieved_at) values ('0000000004','','{}', now())$$, '23514', 'name cannot be empty');
  select pg_temp.expect_error($$insert into public.sec_company_list (id, entries, generated_at) values (2, '[]', now())$$, '23514', 'the company list is a single row');
  select pg_temp.expect_error($$insert into public.sync_requests (cik) values ('abc')$$, '23514', 'a request CIK must be 10 digits');
  -- upsert replaces the row for the same company
  insert into public.company_financials (cik, name, data, retrieved_at) values ('0000320193','Apple Inc. v2','{"a":1}', now())
    on conflict (cik) do update set name = excluded.name, data = excluded.data, retrieved_at = excluded.retrieved_at;
  select pg_temp.assert((select count(*) from public.company_financials) = 1 and (select name from public.company_financials) = 'Apple Inc. v2', 'upsert replaces a company in place');
rollback;

\echo SEC DATA TESTS PASSED
