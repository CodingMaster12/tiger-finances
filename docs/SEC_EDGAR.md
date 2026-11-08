# SEC EDGAR data layer: sources, algorithms, limits

Implemented in `src/lib/sec` (milestone 3). Research done 2026-11-08 from real calls and the providers' own pages.
Marked VERIFIED = observed in a real call; UNVERIFIED = not yet confirmed. Plain-language summary: the app reads company
numbers from the SEC's free public data, cleans them (duplicates, changing labels, year-to-date quarters), keeps the source and
currency on every number, and says "not available" instead of guessing.

Code map: `facts.ts` (section 4C), `statements.ts` + `metrics.ts` (4D/4F), `search.ts` + `tickers.ts` (4A), `client.ts` + `cache.ts` +
`service.ts` (4B), tests in `*.test.ts`, fixtures in `src/lib/sec/__fixtures__` (trimmed real SEC data).
Note: the sections below were written before coding; where the code differs, the code and its tests are the truth.
Known differences: Shopify total liabilities stays unavailable (equity is not a confirmed total); the ticker download is
UNVERIFIED because the SEC throttled the cloud IP (see section 10).

on 2026-11-08 from the cloud container. Anything marked UNVERIFIED must be checked before we rely on it.

## 1. Why EDGAR
- Official US government source (the SEC). Free, no API key.
- Terms for display/reuse: see section 8.
- Covers fundamentals only. EDGAR has NO price data. Prices are a separate open problem (section 9).

## 2. Endpoints (VERIFIED unless noted)
| Purpose | URL | Notes |
|---|---|---|
| Company facts (all XBRL numbers for one company) | `https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json` | CIK zero-padded to 10 digits. AAPL 3.9 MB, SHOP 1.0 MB, RY 1.9 MB. |
| Company profile + filing list | `https://data.sec.gov/submissions/CIK##########.json` | name, tickers[], exchanges[], SIC code + text, fiscalYearEnd (MMDD), stateOfIncorporation, recent filings. |
| Ticker to CIK list | `https://www.sec.gov/files/company_tickers.json` and `company_tickers_exchange.json` | Got HTTP 403 "Request Rate Threshold Exceeded" from this container (shared IP). NOT yet verified. Retry politely before design depends on it. |
| One concept for one company | `.../api/xbrl/companyconcept/CIK##########/us-gaap/Revenues.json` | UNVERIFIED (not needed; companyfacts is enough). |
| One period across all companies | `.../api/xbrl/frames/...` | UNVERIFIED (not needed for MVP). |

## 3. What the real data looks like (VERIFIED)
| Company | Filer type | Taxonomy | Currency | Annual form | Notes |
|---|---|---|---|---|---|
| Apple (AAPL) | US domestic | us-gaap | USD | 10-K | FY ends late Sept (52/53 week years, e.g. 2026-09-26) |
| Shopify (SHOP) | Canadian, switched to US forms | us-gaap | USD | 10-K (older years 40-F) | No total "Liabilities" tag found |
| Royal Bank (RY) | Canadian foreign private issuer | ifrs-full | CAD | 40-F (interims on 6-K) | Bank: no GrossProfit, OperatingIncome or capex tags |

Consequences:
1. Canadian companies that file with the SEC ARE covered, in their own reporting currency (CAD for RY). Never label CAD as USD.
2. Canadian companies that do not file with the SEC (many TSX-only names) have NO data here. We must say so, not invent it.
3. Concept names differ by taxonomy and change over time (Apple's `Revenues` stops in 2018; its revenue lives in
   `RevenueFromContractWithCustomerExcludingAssessedTax` afterwards). Shopify's revenue tag also changes in 2023.
   So concept choice must be made PER PERIOD, not once per company.
4. The same fact appears many times (one row per filing that repeated it). Apple net income for FY ending 2025-09-27 appears in the
   2025 10-K and again in the 2026 10-K. We must dedupe.
5. `fy` and `fp` on a row describe the FILING, not the period of the number. Never group by `fy`. Group by `start`/`end` dates.
6. Row fields: `start` (flows only), `end`, `val`, `accn`, `fy`, `fp`, `form`, `filed`, optional `frame` (e.g. CY2025).
7. Flow values (income, cash flow) in 10-Q/6-K filings are often year-to-date (3, 6, 9 months), not single quarters.
   Period-length buckets seen for Apple net income: ~90, ~180, ~270, ~360 days.
8. Balance sheet values are "instants": they have only `end`, no `start`.

## 4. Algorithms

### A. Identity: ticker or name to company
1. Download the ticker list once, store in a small table/cache refreshed daily (UNVERIFIED download, see section 2).
2. Normalize input: uppercase, trim, map `BRK.B` style to the list's `BRK-B` style, strip exchange suffixes (`.TO`, `.V`).
3. Search order: exact ticker match, then ticker prefix, then name word-prefix match, then name substring. Cap results at 10.
4. Ambiguity: several rows can share a CIK (share classes). Return one company with its ticker list; show the exchange from the `submissions` file.
5. Output: `{cik, name, tickers[], exchange(s), sic, sicDescription, fiscalYearEnd, filerCategory}`.
6. A TSX-only ticker (no CIK) returns `not_covered` with reason "Not an SEC filer".

### B. Fetch, validate, cache
1. Fetch `companyfacts` + `submissions` for the CIK server-side only.
2. Validate with Zod: tolerate unknown fields, require `facts` object, each fact `units` map of arrays with `end`, `val`, `form`, `filed`.
3. Reject and report (do not guess) when a value is not a finite number.
4. Normalize into our own types, then throw away the raw payload (we store only what we need, with `source`, `retrievedAt`).
5. Cache: in-memory per server instance plus a database table (later), keyed by CIK. TTL: facts 12 hours (filings are quarterly),
   ticker list 24 hours. Serve stale-on-error with a visible "as of" date.
6. De-duplicate concurrent requests for the same CIK (single in-flight promise per key).
7. Throttle all SEC calls through one queue: at most a few per second (SEC limit pending research; assume <= 10/s) with a
   descriptive User-Agent from an env var (needs a real contact; NOT the owner's personal email unless they choose it).
8. On 403/429: back off exponentially with jitter, return cached data if any, otherwise a typed "provider busy" error.

### C. Period construction (the core of correctness)
For each statement line (a "metric") we have an ordered list of candidate concepts, per taxonomy.
```
revenue:   RevenueFromContractWithCustomerExcludingAssessedTax, Revenues, SalesRevenueNet,
           RevenueFromContractWithCustomerIncludingAssessedTax, ifrs-full:Revenue
netIncome: NetIncomeLoss, ProfitLoss, ifrs-full:ProfitLoss(AttributableToOwnersOfParent)
...
```
Annual periods:
1. Collect rows for all candidate concepts. Keep rows with `start` and 350 <= (end - start) <= 380 days.
2. Key each row by (end date). For the same end date keep the row from the MOST RECENTLY FILED filing (handles restatements);
   remember the original value too so we can flag "restated".
3. If several concepts have a value for the same end date, take the first concept in priority order. Record which concept was used.
4. Use only forms 10-K, 40-F, 20-F (annual) for annual columns. Ignore 10-K/A unless it is the only source.
5. Label the period by its END DATE and fiscal-year-end, not by `fy`. Display "FY ended 26 Sep 2026".
6. Return the latest N (default 5) annual periods.

Quarterly periods:
1. Flow metrics: take rows with ~90 day duration (80-100) from 10-Q / 6-K.
2. Q4 is never reported on its own. Derive: Q4 = FY value - (9-month YTD value) when both come from the same company, same fiscal year,
   same concept. If the 9-month row is missing, mark Q4 "not available". Never interpolate.
3. If a 10-Q only reports YTD (e.g. cash flow), de-cumulate: Q2 = 6M - 3M, Q3 = 9M - 6M. Both sides must exist, otherwise "not available".
4. Balance sheet items are instants: take the value at each quarter end date directly.
5. 52/53-week years: allow +/- 7 days when matching quarter boundaries to a fiscal year.

Currency/units:
1. Use the row's unit as the currency (`USD`, `CAD`). Per-share: `USD/shares`. Shares: `shares`.
2. Never convert currencies in this layer. If a comparison needs conversion we show both or refuse (milestone 6).

### D. Derived metrics (pure functions, extend `calculations.ts`)
- Gross profit: reported `GrossProfit`; if missing and revenue and cost of revenue exist, calculate and mark `calculated`.
- Free cash flow = operating cash flow - capex (capex taken as absolute value; EDGAR reports payments as positive). Missing capex -> `null`, never 0.
- Total liabilities: reported if present, else `Assets - Equity` marked `calculated` (needs both at same date and same equity concept including NCI).
- Margins = metric / revenue; `null` if revenue missing or 0.
- Growth = (current - prior) / abs(prior); `null` if prior is 0 or missing; mark "n/m" if sign flips.
- P/E, P/S, P/B, market cap, EV/EBITDA, dividend yield need a PRICE. Not available until a price source is chosen. Show "—", not guesses.
- Banks and insurers (SIC 60xx-64xx): hide gross profit, operating income, capex, FCF rows rather than show fake zeros.

### E. Profile fields
- name, SIC description (as the "industry"), exchange, fiscal year end, incorporation, filer category from `submissions`.
- No company description text or sector in EDGAR JSON. Sector is a SIC mapping we maintain (SIC 2-digit division to sector name).
  UNVERIFIED that this is good enough for a polished UI; description text would be omitted or link to the latest 10-K business section.

### F. Provenance on every number
`{value, unit, periodStart, periodEnd, fiscalPeriod, form, filedDate, accession, concept, taxonomy, source: "SEC EDGAR", retrievedAt, kind: reported|calculated}`.
UI later shows source and filing date; the accession number links to the filing on sec.gov.

### G. Tests (no network in CI)
1. Save trimmed real responses for AAPL, SHOP, RY as fixtures (small JSON subsets).
2. Unit tests: dedupe picks latest filing; concept fallback across years (Apple 2018 boundary, Shopify 2023); Q4 derivation; YTD de-cumulation;
   52/53-week tolerance; currency stays CAD for RY; missing capex -> null; bank hides gross profit.
3. Contract test: Zod schema accepts fixtures and rejects malformed rows.
4. One optional live smoke test script (not in CI) that hits the real API sparingly.

## 5. Known limits (honest list)
- No prices, market cap, valuation ratios, dividend yield, price charts from EDGAR.
- Only SEC filers. TSX-only Canadian companies are not covered.
- Data lags: annual and quarterly filings only, no real-time fundamentals.
- Banks/insurers use different line items; some rows legitimately empty.
- Company-specific custom tags (extension `shop:` etc.) are ignored; some companies will have gaps.
- XBRL data contains the occasional company error or restatement; we show source and filing date.

## 6. Pending research
- None for fundamentals. Prices: see section 9.

## 9. Prices: no free source found that allows public display
Read from the providers' own pages (2026-11-08). "No" means the terms read prohibit it or limit use to personal/non-commercial.
| Source | Public display on free tier | Evidence |
|---|---|---|
| Twelve Data Basic | No | "Internal non-display usage"; external display needs a Redistribution add-on |
| FMP Basic | No | s2.2.2 bans showing data on websites/apps for multiple people without an agreement; s2.2.1 personal use only |
| Alpha Vantage free | No | Licence for "personal, non-commercial use"; commercial includes providing information to others (read from the PDF terms) |
| Finnhub free | No | Redistribution of data or derived results to any third party needs written approval |
| Massive (Polygon) free | No | Individuals terms: personal, non-commercial; market data terms ban sharing or building a service for other users |
| EODHD | No (non-professional) | Non-professional users may not redistribute or display |
| Yahoo Finance | No | Scraping and commercial reuse barred; not an API |
| FRED | Not for raw data | Cannot display raw data on a site without permission; charts with credit line are allowed; equity prices not confirmed to exist there |
| Bank of Canada | Allowed with attribution | But no equity prices (exchange rates only) |
| Stooq, Tiingo, Nasdaq Data Link, Marketstack | UNKNOWN | Pages were empty, 404, or redirected; not assessed |
Open leads (UNVERIFIED, not yet researched): embeddable third-party chart widgets (e.g. TradingView-style free widgets) which are
designed to be placed on websites and would show prices without us storing or serving the data; Tiingo / Stooq terms via correct URLs.
Consequence: price chart, market cap, P/E, P/S, P/B, EV/EBITDA and dividend yield cannot be built from free licensed-for-display data today.

## 10. Risks to track
- SEC blocked `www.sec.gov` ticker files from the shared cloud IP (HTTP 403, "Request Rate Threshold Exceeded") while `data.sec.gov` worked.
  Vercel serverless IPs are also shared, so the same block could hit production. Mitigation: generate a ticker snapshot file with a script
  and ship it in the repo (refresh by hand now and then); fetch only data.sec.gov live; cache hard; stay under ~3 requests/second.
- Data.sec.gov JSON has no explicit licence text. The SEC site says its content is free to reuse. Low risk, but noted honestly.

## 8. SEC rules (read from sec.gov pages; page review dates 2023-2025)
- Rate limit: max 10 requests/second TOTAL regardless of machines. Over it, the IP may be blocked briefly; access resumes after
  the rate has been under the limit for 10 minutes. (This is what we hit on www.sec.gov from the shared container IP.)
  Our design: queue + a few requests/second + caching, so we stay far below 10/s.
- User-Agent: must be declared, sample format "Company Name AdminContact@domain.com". Undeclared automated tools are blocked.
  DECISION NEEDED from owner: what contact to put in it (env var `SEC_USER_AGENT`). Not set from the owner's personal email without their say-so.
- Reuse/display: "All Government-created content on sec.gov and EDGAR public filing content are free to access and reuse"; content
  "may be copied or further distributed by users of the web site without the SEC's permission." Citation to the SEC is requested,
  not required. No commercial-use restriction found. Do not use the SEC seal/logos; do not imply SEC affiliation or approval.
  CAVEAT: nothing states a license for the data.sec.gov JSON specifically. Applying the website rule to it is an inference
  (the API page says only that no authentication or keys are needed). Third-party material inside filings is not assessed.
- Caching: no explicit guidance. Bulk files (companyfacts.zip, submissions.zip) are rebuilt nightly around 3 a.m. ET; SEC says
  "download only what you need and moderate requests."
- Freshness: APIs update in real time as filings arrive (submissions < 1 s, XBRL facts < 1 min typical).
- Forms covered: 10-Q, 10-K, 8-K, 20-F, 40-F, 6-K and variants. Taxonomies: us-gaap, ifrs-full, dei, srt (custom extensions excluded).
- Not found: schema docs for the ticker files; whether every 6-K carries XBRL (RY shows 6-K rows, so many do).

## 11. Data pipeline (added 2026-11-09)
Where it runs: the owner's computer (`bash scripts/mac-sync.sh`); GitHub Actions was tried and refused.
Why: the SEC returns 403 ("undeclared automated tool") to shared cloud servers: this container (repeatedly) and Vercel (verified on the live site). So the website never depends on reaching the SEC.
Flow: `sec-sync` job (scripts/sec-sync.mts, logic in src/lib/sec/sync.ts) -> SEC (companyfacts + submissions, at most 4 requests/second, declared User-Agent) -> same engine as section 4 -> Supabase `company_financials` (JSON, validated on read) ; the SEC company list -> `sec_company_list` ; visitor requests -> `sync_requests`.
Per run: (1) refresh the company list; if the SEC refuses (403) stop at once, change nothing, exit 1. (2) Plan, in order: queued requests, explicit CIKs, missing seed tickers, stale rows (older than 7 days or old schema version). Capped per run (default 150) and in total (3000 companies). (3) For each: fetch, convert, save, clear the request; a company with no structured data is recorded as `not_covered` (3 attempts max).
Site lookup order: database -> live SEC (works only if the SEC ever accepts the server; fails fast) -> saved copy (Apple, Shopify, Royal Bank) -> queue the company if it is on the SEC list -> plain error.
