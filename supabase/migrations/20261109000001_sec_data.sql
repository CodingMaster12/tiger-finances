-- Stored SEC company data for Tiger Finances.
--
-- The SEC refuses requests from shared cloud servers (including Vercel), so a scheduled job that runs
-- from a connection the SEC accepts downloads company filings, turns them into normalized statements and
-- saves them here. The website only reads from these tables.
--
-- Access model (all enforced by row-level security):
--   company_financials, sec_company_list : public SEC data; anyone may read, nobody but the service role may write
--   sync_requests                        : private queue; only the service role (the website's server and the job) may touch it

-- ---------------------------------------------------------------------------
-- company_financials: one row per company, holding the normalized statements as JSON
-- ---------------------------------------------------------------------------
create table public.company_financials (
  cik            text primary key,
  name           text not null,
  tickers        text[] not null default '{}',
  data           jsonb not null,                    -- CompanyFinancials, see src/lib/sec/types.ts
  schema_version integer not null default 1,        -- bumped when the JSON shape changes; older rows are re-fetched
  retrieved_at   timestamptz not null,              -- when the numbers were downloaded from the SEC
  updated_at     timestamptz not null default now(),
  constraint company_financials_cik_format check (cik ~ '^[0-9]{10}$'),
  constraint company_financials_name_length check (char_length(name) between 1 and 300),
  constraint company_financials_data_is_object check (jsonb_typeof(data) = 'object'),
  constraint company_financials_data_size check (octet_length(data::text) <= 2000000)
);

create index company_financials_retrieved_at_idx on public.company_financials (retrieved_at);

-- ---------------------------------------------------------------------------
-- sec_company_list: the SEC's company/ticker list (one row), so search can find every company
-- ---------------------------------------------------------------------------
create table public.sec_company_list (
  id           smallint primary key default 1,
  entries      jsonb not null,                      -- [[cik, name, ticker, exchange], ...]
  generated_at timestamptz not null,
  updated_at   timestamptz not null default now(),
  constraint sec_company_list_single_row check (id = 1),
  constraint sec_company_list_is_array check (jsonb_typeof(entries) = 'array')
);

-- ---------------------------------------------------------------------------
-- sync_requests: companies a visitor asked for that are not saved yet
-- ---------------------------------------------------------------------------
create table public.sync_requests (
  cik             text primary key,
  requested_at    timestamptz not null default now(),
  attempts        integer not null default 0,
  last_attempt_at timestamptz,
  last_error      text,
  constraint sync_requests_cik_format check (cik ~ '^[0-9]{10}$')
);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.company_financials enable row level security;
alter table public.sec_company_list   enable row level security;
alter table public.sync_requests      enable row level security;

create policy "SEC financials are public" on public.company_financials for select to anon, authenticated using (true);
create policy "SEC company list is public" on public.sec_company_list  for select to anon, authenticated using (true);
-- sync_requests: deliberately no policy for anon or authenticated. Only the service role (which bypasses RLS) can use it.

-- Defence in depth: even if a policy were added by mistake, the public roles keep no write privileges.
revoke all on public.company_financials from anon, authenticated;
revoke all on public.sec_company_list   from anon, authenticated;
revoke all on public.sync_requests      from anon, authenticated;
grant select on public.company_financials to anon, authenticated;
grant select on public.sec_company_list   to anon, authenticated;
