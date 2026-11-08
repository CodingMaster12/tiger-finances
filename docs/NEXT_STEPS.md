# Status and what the owner must do

## Done (code, committed)
- Milestone 1: scaffold, design tokens, UI kit, tested finance calculations.
- Milestone 2: accounts, profiles, unique usernames (change once per 14 days), settings, RLS.
- Tests: `npm test` (58), `npm run test:db` (35 database assertions incl. cross-user isolation).
- Live auth verified by the owner (register, confirm, login, reset, profile, password). Account deletion: not yet confirmed.
- Milestone 3 (data layer) built: SEC EDGAR fundamentals engine in `src/lib/sec` (see `docs/SEC_EDGAR.md`). Not yet shown on any page. Free price data that may legally be displayed was not found, so there are no prices for now (owner decision). Next: milestone 4 (search + company overview), after the owner approves.
- Fresh checkout: run `npx next typegen` before `npm run typecheck` (route types are generated).

## Owner checklist
1. Supabase: follow `docs/SUPABASE_SETUP.md` (run `supabase/migrations/*.sql` in the SQL Editor,
   configure URL Configuration and Email sign-in, copy Project URL, Publishable key, Secret key).
2. Claude cloud environment (⚙ next to the environment name): add
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`,
   `NEXT_PUBLIC_SITE_URL`; then start a NEW session.
3. Vercel: follow `docs/VERCEL_DEPLOY.md` once this repo has the code.
4. Allow Claude to push to this repo: install the Claude GitHub App on it
   (https://github.com/apps/claude/installations/select_target) or reconnect GitHub at
   claude.ai → Settings → Connectors.
5. SEC data needs no key, only a contact line. Set `SEC_USER_AGENT` to exactly `Tiger Finances https://github.com/CodingMaster12/tiger-finances` in the Claude environment and in Vercel (same way as step 2/3). Required in production. Then retry the live SEC check in a fresh session (the cloud address was being refused as an "undeclared automated tool").
6. (Optional now: the site tries this itself on every build once step 5 is done.) On your own computer (not the cloud, whose address the SEC throttles) run once: `SEC_USER_AGENT="Tiger Finances https://github.com/CodingMaster12/tiger-finances" npm run sec:tickers`, then commit `src/lib/sec/data/company-tickers.json`. Until then search only knows three starter companies.

## Open items
- Theme: light only for now (dark tokens staged, no setting yet).
- Email: Supabase's free sender is limited; custom SMTP needed before real users.

## Milestone 4 status (search and company pages)
- Built and tested against a local fake SEC server. To switch on real data: do step 5 above (set `SEC_USER_AGENT` in Vercel), then redeploy. The build then refreshes the company list from the SEC; if the SEC refuses Vercel's address the starter list of 3 companies stays and the company pages for those 3 fall back to saved copies.
- If real company pages show "Live data is not connected yet" after step 5, the SEC is probably refusing Vercel's address; tell Claude and we will pick another way to get the data (for example a once-a-day cached refresh).
