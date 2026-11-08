# Decision log (owner answers and agreed choices)

| Topic | Decision |
|---|---|
| Audience | Multi-user from the start (all data scoped per user with RLS), personal use first |
| Auth | Email + password only. Email verification ON. Password reset ON. **No social login and no fake social buttons.** |
| Username | One unique username (case-insensitive), changeable **once every 14 days** (enforced by a DB trigger). First change is free |
| Theme | Discussed late, then "as is": **light only**. Dark tokens staged, no toggle. Revisit only if the owner asks |
| Look | PayPal-style fintech with lighter colours (navy + bright blue on cool greys) |
| Sync | Workspaces sync across devices through Supabase Postgres |
| Data providers | Free only. **SEC EDGAR for fundamentals** (see rows below and `docs/SEC_EDGAR.md`). No free price source found that allows public display |
| Hosting | Local first, then Vercel Hobby (free, non-commercial). Deployed at https://tiger-finances-six.vercel.app |
| Repo | `CodingMaster12/tiger-finances` (GitHub). Owner had no prior repo. Do not touch `akfromlaurier-create/website-` |
| Name | "Tiger Finances" (placeholder "Meridian" was replaced) |
| Scope order | Plan milestones 1–9 approved; ask before starting each |
| Account deletion | In scope: requires password + typed DELETE; uses `SUPABASE_SECRET_KEY` server-side |
| Canada data (2026-11-01) | Superseded by the two rows below. Kept for history: Option A was "full US data; Canada only what free tiers return" |
| Provider terms (2026-11-08) | **Twelve Data Basic and FMP Basic cannot be used on this site.** Twelve Data: "Internal non-display usage" only, external display needs a paid add-on. FMP Terms s2.2.1/2.2.2: free licence is personal use only and showing data on websites or apps for multiple people is prohibited without an agreement. Alpha Vantage, Finnhub, Massive/Polygon, EODHD and Yahoo also bar public display on free tiers. Both Twelve Data and FMP keys are now unused (owner may delete them) |
| Fundamentals source (2026-11-08) | **SEC EDGAR only** (owner approved). Free, no key, content free to reuse. Covers SEC filers: US companies and Canadian companies that file with the SEC (e.g. Shopify, Royal Bank), in their own currency (CAD stays CAD). TSX-only companies that are not SEC filers are "not covered" and say so. Banks/insurers hide gross profit, operating income, capex |
| Prices (2026-11-08) | **Owner chose option (a): no prices for now.** No price chart, market cap, P/E, P/S, P/B, EV/EBITDA or dividend yield until a legal source exists. Open leads, unverified: embeddable chart widgets; Stooq/Tiingo terms; a paid licensed feed (needs owner approval) |
| SEC contact (open) | The SEC requires a contact in the User-Agent. Env var `SEC_USER_AGENT`, e.g. "Tiger Finances you@example.com". Owner has not chosen the contact yet |
| Registration copy | Terms/privacy are not written; the form says "once they are published". Do not invent legal terms |

## Milestone history
1. Foundation (done): scaffold, tokens, UI kit, finance calculations + tests, shell, `/styleguide`.
2. Accounts (done, owner-verified live): schema + RLS + tests, auth flows, account settings, header menu, route protection.
Post-launch fixes made while deploying: pinned framework in `vercel.json` (404 fix), site-URL scheme tolerance, form values kept
after failed submit, hard redirects + session-keyed forms (stale red error), submit gated on all password rules, specific
weak-password messages.

3. SEC data layer (built 2026-11-08, `src/lib/sec`): period engine, statements, search, polite client, cache, 127 unit tests passing. Not wired to any page yet (milestone 4).

## Things the owner asked for that shape future work
- "Simple and exact instructions", "excruciating detail", "very concise list" when they ask for steps. Match the requested length.
- Always remind them about decisions they deferred. None are currently open except those listed in `CLAUDE.md`.
- They are moving to a new Claude session/project; this repo is the memory. Keep these docs current as work progresses.
