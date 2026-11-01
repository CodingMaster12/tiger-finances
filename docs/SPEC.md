# Product spec (condensed from the owner's "Master Build Prompt v3.0")

Build a polished, production-minded **Market Intelligence Terminal** for US and Canadian public companies.
Not a static dashboard: every feature shown as functional must be connected to a real implementation.
Prioritize analytical correctness, polished design, maintainability and a seamless UX. Free-data-first.
Role: act as senior full-stack engineer, financial data engineer, analyst, architect, product designer.

## Working agreement (from the spec)
Inspect first, interview, propose a plan, get approval, build incrementally, verify at every stage.
At each major milestone report: features implemented, files changed, tests run + results, known limitations,
outstanding decisions, next milestone. Prefer a smaller, reliable, visually excellent app over an oversized incomplete one.
Challenge unsound ideas. Do not silently invent requirements or conceal limitations. Do not claim untested functionality works.
Never fabricate or silently replace financial data; communicate when data is unavailable.

## User journey
Register/sign in → search a company → company research page → price history + financial performance → statements + valuation
→ compare companies → save companies, comparisons, notes → leave and return later → same workspace on another device.

## Module 1: Global search
Search by name and ticker; US + Canadian listings the provider supports; name, ticker, exchange, sector; handle ambiguous tickers;
keyboard navigation; loading/empty/error/no-results states; direct navigation to company pages; debounced requests + caching.
Normalize identifiers and provider responses in the backend.

## Module 2: Company research page
- **Overview:** name, ticker, exchange, sector, industry, description, market cap, latest price, clearly labelled changes,
  reporting currency, data provider + last-updated.
- **Price chart:** 1M, 6M, 1Y, 5Y, max; interactive tooltips; date + price axes; price and %-return views; volume; optional benchmark.
  Never present historical or delayed prices as live. No fabricated observations.
- **Key metrics:** revenue + growth, gross profit/margin, operating income/margin, net income/margin, EPS, free cash flow, assets,
  liabilities, equity, cash, debt, market cap, P/E, P/S, P/B, EV/EBITDA (where reliable), dividend yield.
  Distinguish **reported** vs **locally calculated** values. Handle negative earnings, missing data, incompatible periods, undefined ratios.
- **Trends:** revenue, earnings, margins, FCF; annual + quarterly where supported. Every figure has unit, currency, period, source.

## Module 3: Statements and analysis
Income statement, balance sheet, cash flow; annual first, quarterly where available; fiscal periods + reporting dates; consistent
currency/number formatting; trend visualization; source attribution; explicit missing-data states.
Calculations are separate, testable pure functions (growth, margin, FCF = OCF − capex, P/E meaningful only for positive EPS…).
Handle zero denominators, negatives, missing inputs, mismatched periods. Price return ≠ total return: never call a price-only
calculation "total return".

## Module 4: Comparison
At least 2, ideally 3 companies. Revenue + growth, margins, EPS, market cap, valuation ratios, FCF, debt and cash, historical % returns.
Add/remove/replace companies. Normalize history to a common start. Handle incompatible currencies/periods/definitions explicitly.
Save a comparison to the account and reopen with companies and settings restored (say so if it recalculates on current data).

## Accounts and persistence (partly built)
Registration, login, logout, session persistence, password reset, email verification, account settings, protected routes, useful errors.
Use a trusted provider (Supabase Auth); no custom password storage; no secrets in client code; backend authorization never relies on
frontend guards. Account menu: avatar/initials, name/email, settings, saved workspace, logout. Settings: profile, preferences
(default comparison settings, default market), security (password change; account deletion with confirmation and re-auth).
Persistent workspace: multiple watchlists (rename, reorder, no duplicates), saved comparisons (rename/delete), bookmarks, notes
(edit/delete), recently viewed, preferences. Optimistic UI only where safe; reconcile on failure; no stale or contradictory data.
Database: foreign keys, uniqueness, timestamps, indexes; RLS on **every** user-owned table with tests for cross-user isolation,
including direct API requests. Service-role/secret keys never reach the browser. AI-generated research is **deferred**: do not build it.

## Visual design (core requirement)
Design system first: tokens (color, type scale, spacing, radii, elevation, control heights), buttons, inputs, tables, charts, focus,
loading/error treatments, breakpoints. Restrained fintech palette; positive/negative never rely on color alone. Information-dense,
not generic cards-everywhere. Tabular numerals; consistent formatting. Shell: nav, global search, account menu, main content,
contextual navigation on company pages. Charts: consistent axes, gridlines, margins, legends, tooltips (exact date, value, unit,
metric), responsive, empty/loading states, no misleading axes, consistent per-company colors. Tables: right-aligned numerics,
consistent precision, currency/units, period headings, overflow handling, unavailable-value indicators.
Forms share one visual language with all states. Restrained microinteractions, respect reduced motion. Desktop primary, but mobile
and tablet must be properly adapted. Accessibility: semantic HTML, labels, keyboard, visible focus, contrast, ARIA only when needed.
**Inspect real layouts in a browser** (desktop, tablet, mobile; long names; large numbers; errors) and fix defects.

## Data and free-tier constraints
Investigate current official docs for each candidate provider (coverage, history, statements, profiles, valuation, limits, auth,
delay, attribution, redistribution/commercial restrictions). Recommend the smallest practical combination. No purchases.
Normalized interfaces for search/profile, prices, statements, derived metrics; validate external responses; keep source, currency,
period, observation + retrieval timestamps; caching, rate-limit handling, request dedup, useful provider errors.
Private keys server-side only; `.env.example` placeholders; document how to obtain each credential.

## Engineering standards
Separate calculations from UI; reusable components where they help; validate all external/user data; strict meaningful types;
tests for calculations and security-critical operations (unit, provider integration, auth/authorization, e2e); no non-functional
buttons; no unnecessary dependencies or services.

## Acceptance criteria (MVP complete only when all hold)
Core: search US + CA companies; company pages show real attributed data; charts use real observations; statements have consistent
periods and currencies; core calculations pass unit tests; compare ≥2 companies; missing data handled honestly.
Accounts: register/login/session/logout/reset work; protected data inaccessible without auth; watchlists and comparisons save and
reopen; notes and preferences persist; data available across devices; cross-user access rejected by backend and DB policies.
Design: cohesive system; complete form states; polished charts and tables; usable desktop and mobile; accessibility basics;
designed empty/loading/success/error states; no placeholder screens.
Engineering: runs locally with documented steps; lint + typecheck pass; critical tests pass; formulas independently verified;
credentials protected; free-tier limits documented; no paid service enabled; no feature misrepresented as complete.
Delivery: working app, setup instructions, `.env.example`, migration instructions, auth + provider setup, README, test commands,
deployment instructions, implemented-features list, known limitations, suggested future improvements. Report unmet criteria explicitly.
