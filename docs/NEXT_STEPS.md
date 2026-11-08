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

## Milestone 4 status (search, company pages, data pipeline)
The SEC refuses Vercel's servers (confirmed on the live site), so company data is fetched by a **sync job** from a connection the SEC accepts and saved in Supabase. The site reads the database.
Status: SQL applied (verified from the cloud: tables exist, public tables readable and empty, queue private). GitHub's servers were refused by the SEC (403), so the job runs on the owner's Mac.
Owner steps (Mac):
1. Download `https://github.com/CodingMaster12/tiger-finances/archive/refs/heads/main.zip` (or the milestone-4c-mac-sync branch zip before it is merged) and double-click it in Downloads to unzip.
2. Install Node.js if needed: nodejs.org, big green LTS button, open the file, Continue until done (the script tells you if it is missing).
3. Open Terminal (Cmd+Space, type Terminal, Enter) and run: `bash ~/Downloads/tiger-finances-main/scripts/mac-sync.sh` (folder name = the zip's folder).
4. First run only: paste the Supabase project URL, then the Supabase secret key (hidden as you type; never paste it in chat). Wait 1-3 minutes for "Finished".
5. Re-run the same command whenever you want newer data or to add companies visitors asked for (the queue is processed each run). It is safe to run any time.
Optional later: schedule it automatically on the Mac (launchd) if wanted.
