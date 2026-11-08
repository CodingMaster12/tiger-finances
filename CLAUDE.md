# Tiger Finances: project memory for Claude

Read this first. Then read `docs/SPEC.md` (the product spec), `docs/DECISIONS.md` (what was decided and why)
and `docs/NEXT_STEPS.md`. This file is the source of truth for state, rules and gotchas.

## What this is
A Market Intelligence Terminal: an equity research web app for US and Canadian public companies with real
accounts, saved workspaces, financial statements, charts and comparisons. Portfolio-grade: correctness,
honest data handling, polished design. Product name: **Tiger Finances** (owner's choice).

## The owner and how to work with them
- The owner is the product owner and is **not** a developer. Give **simple, exact, click-by-click
  instructions** with "You should see…" checks. They explicitly asked for very detailed steps.
  They use claude.ai/code in Chrome on a Mac, and the Supabase and Vercel dashboards.
- Be concise in chat. Tables and short numbered lists work well. Ask only about decisions that matter
  (scope, data accuracy, security, cost, UX). Recommend defaults.
- **Never ask the owner to paste keys or passwords into chat.** Secrets go in the cloud environment settings
  (gear icon next to the environment name `tiger-finances` in the session's right-hand panel) or in Vercel/Supabase
  dashboards. A changed environment needs a **new session** to take effect.
- **No paid services** without explicit approval. Free tiers only. Do not enable paid usage.
- Be honest: say what was verified and what was not. Never claim untested things work. Mark dashboard labels
  you could not confirm as "(label may differ)". You cannot see their screen; ask for screenshots.
- Ask before outward-facing or hard-to-reverse actions. Do not delete or overwrite without looking first.
- **Theme (changed twice on 2026-11-08):** the owner replaced the earlier "light, PayPal-style" direction. The site is **dark only**, ink-violet
  ground with an animated gradient backdrop (`body::before`). Gold is the brand anchor; highlight tones are orange, pink, violet, cyan and
  emerald (`--orange --pink --violet --cyan --lining`), gradients `.bg-hot/.bg-cool/.bg-fresh` are for fills only, never text. Eye-catching but
  professional (owner's "0.75" setting; keep it there, do not push brighter without being asked): animated `HeroScene`, marquee and tile art on the
  home page, calm on data pages (Numbers, tables). Numbers live on `/numbers`, not the
  home page. Gains/losses always use arrow + sign + colour. Display face Jost (semibold, uppercase), body/numbers Inter. All motion stops
  under prefers-reduced-motion (verified). `PRODUCT.md` holds the product
  record and brand commitments; the Impeccable design skill is installed in `.claude/skills/impeccable` (run `/impeccable` for design work).
- No social login and no fake buttons. Username is unique, changeable once per 14 days.

## Stack
Next.js 16 (App Router, `cacheComponents` on), React 19, strict TypeScript, Tailwind 4, Zod 4, Recharts (installed, unused yet),
Supabase (Auth + Postgres + RLS) via `@supabase/ssr`, Vitest, Playwright (installed; no e2e tests written yet), Vercel (Hobby).

Commands: `npm run dev | build | lint | typecheck | test | test:db | sec:tickers`
- `npm test`: unit tests (currently 127). `npm run test:db`: applies migrations to a throwaway local Postgres 16 and runs
  35 RLS and ownership assertions (no Docker needed; needs PG server binaries, which the cloud container has).
- Before every commit: lint, typecheck, test, build all clean; run `test:db` when SQL changes.

## Repo map
- `src/proxy.ts`: Next 16 "proxy" (renamed middleware): refreshes the Supabase session via `getClaims()`, redirects
  signed-out users from `/account`. Guards are UX only; **RLS and server checks are the real authority**.
- `src/app/auth/actions.ts`, `src/app/account/actions.ts`: server actions (register, login, logout, reset, profile,
  preferences, change password, delete account). `src/app/auth/callback/route.ts`: email-link PKCE code exchange.
- `src/lib/supabase/{client,server,admin,verify-password,config}.ts`: `admin.ts` is `server-only` (secret key).
- `src/lib/validation/auth.ts`: Zod schemas, password rules (10+ chars, a letter, a number, max 72 bytes), `safeNextPath`.
- `src/lib/finance/calculations.ts`: pure financial formulas returning `null` for undefined results (never NaN).
- `src/lib/format.ts`: display formatting; missing values render as "—".
- `src/lib/sec/*`: SEC EDGAR fundamentals (milestone 3). `facts.ts` period engine (dedupe, concept fallback per period, derived quarters),
  `statements.ts` assembler, `metrics.ts`, `search.ts` + `tickers.ts` + `data/company-tickers.json` (ticker snapshot), `client.ts` (throttled, `server-only`),
  `cache.ts`, `service.ts` (`financialsService.getCompanyFinancials(cik)`). Algorithms and sources: `docs/SEC_EDGAR.md`. Test fixtures are trimmed real SEC data.
- `src/app/numbers` + `src/components/numbers` + `src/lib/sec/sample.ts`: the Numbers page, real statements from saved SEC filings (fixtures) for
  Apple, Shopify, Royal Bank, built with the same engine as live data will use. `src/components/home/*`: home scene, marquee, tile art.
  `src/components/layout/*`: header (`nav-links.tsx` marks the current page), footer, 404 at `src/app/not-found.tsx`.
- `src/components/ui/*`: design-system kit. Tokens in `src/app/globals.css`. `/styleguide` shows them.
- `supabase/migrations/*.sql`, `supabase/tests/*`: schema, RLS, tests. `docs/`: guides.

## Database (migration `20261025000001_profiles_and_preferences.sql`)
`profiles` (id→auth.users, unique `lower(username)`, `username_changed_at`, display_name),
`user_preferences` (default_market ALL|US|CA, default_comparison_range). Signup trigger creates both rows and falls back to a
generated username if the requested one is invalid or taken. A trigger enforces the 14-day username rule. Column-level grants
mean clients can only update `username, display_name` / the two preference columns. `username_available()` RPC is callable by anon.
**New user-owned tables must have RLS, ownership policies, FK to auth.users, and a cross-user test in `supabase/tests`.**
Migrations are applied by the owner by pasting into the Supabase SQL Editor. Give them the exact SQL each time.

## Hard-won gotchas (do not relearn these)
- **Cache Components:** anything reading `cookies()`, `headers()`, `searchParams` must be inside `<Suspense>`, or the build fails.
- **Next keeps hidden pages' state (React `<Activity>`):** soft redirects leak old form errors across sign-out/sign-in.
  We use `useHardRedirect` (full page load) after login/logout/reset/delete, and key account forms by the session id.
- Supabase keys are the new style: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`) and `SUPABASE_SECRET_KEY`.
- Supabase rejects some passwords itself (`weak_password` with `reasons`: length/characters/pwned) per dashboard settings.
  We show the reason via `weakPasswordMessage`.
- `NEXT_PUBLIC_SITE_URL` must include `https://`. A missing scheme produced broken email links; `normalizeSiteUrl` now tolerates it.
- `vercel.json` pins `"framework": "nextjs"`. A deployment built with framework "Other" served a 404 on every route.
- Email links use PKCE: they must be opened **in the same browser** that requested them. Supabase's free built-in email sender is
  rate-limited and may only deliver to the owner's own team address; custom SMTP is needed before real users.
- **Data licensing:** free tiers of Twelve Data, FMP, Alpha Vantage, Finnhub, Massive/Polygon, EODHD and Yahoo all forbid showing their data on a public multi-user site. Do not add them. SEC EDGAR is the approved source. Re-read terms before adding any provider.
- **SEC rules:** max 10 req/s total, declared User-Agent with contact (`SEC_USER_AGENT`, required in production), cache hard. The SEC throttles shared cloud IPs (HTTP 403 "Request Rate Threshold Exceeded", lifts after ~10 min); the cloud container hit this repeatedly. Never loop on 403. Only `data.sec.gov` is fetched live; the ticker list is a committed snapshot.
- EDGAR facts: `fy`/`fp` describe the filing, not the period; use start/end dates. Per-share values are never derived by subtraction. Never convert currencies in the SEC layer.
- Never run `pkill -f` / `pgrep -f` with a pattern that appears in your own command line: it kills your shell. Kill by port
  (`fuser -k 3100/tcp`). A stale `next start` on a port serves an old build.
- A scaffold quirk: README edits via string-replace silently no-op'd once. Verify edits actually applied.
- No Docker daemon in the cloud container. Live auth cannot run locally; test against the deployed site instead.

## Git rules
- Remote: `CodingMaster12/tiger-finances`, branch `main`; Vercel auto-deploys on push. Claude needs the Claude GitHub App
  installed/connected on that repo to push.
- Commit as `Claude <noreply@anthropic.com>` (`git config user.email noreply@anthropic.com; git config user.name Claude`).
  A stop hook flags commits with other identities as Unverified. End messages with the attribution lines the system gives.
- **Never rewrite published commits.** The repo's original "Initial commit" (`8c05cad`) is the root.
- Never commit secrets. Only `.env.example` is tracked.

## Deployment state
- Live: `https://tiger-finances-six.vercel.app` (Vercel Hobby = free, **non-commercial only**).
- Vercel env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (Secret type),
  `NEXT_PUBLIC_SITE_URL=https://tiger-finances-six.vercel.app`. Supabase **URL Configuration** Site URL and Redirect URL
  (`…/**`) are set to that address, plus `http://localhost:3000/**`.
- The repo `akfromlaurier-create/website-` belongs to the owner for something else. **Leave it alone.**

## Status
- **Done and verified live by the owner:** register, email confirmation, sign-in, session survives refresh, profile and
  username (14-day rule), preferences, password change, sign-out/in, password reset, header account menu.
- **Not confirmed:** account deletion (needs `SUPABASE_SECRET_KEY`; owner was told to test it last).
- **Built, not shown on pages yet:** SEC data layer (milestone 3, 127 tests incl. real-data fixtures for Apple, Shopify, Royal Bank). Live end-to-end check against the SEC could not be completed because the container IP was throttled (see gotchas); status in docs/NEXT_STEPS.md.
- **Not built:** milestones 4–9: search UI, company pages, charts, comparison, watchlists, notes. **No prices** (owner decision): no price chart, market cap or valuation ratios.
- Known gaps: no e2e (Playwright) tests; no terms/privacy pages (the register form says "once they are published"); no custom SMTP.

## Roadmap (owner approved the plan; ask before each milestone starts)
3. **Data layer: DONE (code).** SEC EDGAR fundamentals only; prices deferred (owner choice a). See `docs/SEC_EDGAR.md` and DECISIONS.md. Contact chosen: `SEC_USER_AGENT=Tiger Finances https://github.com/CodingMaster12/tiger-finances` (owner must still set it in Vercel + Claude env). Open: run `npm run sec:tickers` on the owner's computer; retry the live SEC check.
4. Global search + company overview page (no price/valuation yet). 5. Statements (annual + quarterly) + trend charts (revenue, earnings, margins, FCF; no price chart).
6. Comparison (2–3 companies, normalize returns, handle currency/period mismatches, saved comparisons).
7. Watchlists, notes, recently viewed, preferences. 8. Visual QA (browser), accessibility, e2e tests. 9. Docs and delivery.
Use `Skill` guidance for charts/design if available. Inspect real layouts in Chromium (Playwright is installed) at desktop and mobile.
