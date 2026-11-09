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
5. SEC data needs no key, only a contact line: your app name plus an email, e.g. `Tiger Finances you@example.com` (NO web link: the SEC refuses those). The Mac helper asks for it. Also update `SEC_USER_AGENT` to that value in Vercel and the Claude environment (and the GitHub secret if you try the workflow again).

## Open items
- Theme: light only for now (dark tokens staged, no setting yet).
- Email: Supabase's free sender is limited; custom SMTP needed before real users.

## Milestone 4 status (search, company pages, data pipeline)
The SEC refuses Vercel's servers (confirmed on the live site), so company data is fetched by a **sync job** from a connection the SEC accepts and saved in Supabase. The site reads the database.
Status: SQL applied (verified from the cloud: tables exist, public tables readable and empty, queue private). GitHub's servers were refused by the SEC (403), so the job runs on the owner's Mac.
Owner steps (Mac):
1. Download `https://github.com/CodingMaster12/tiger-finances/archive/refs/heads/main.zip` (or the milestone-4c-mac-sync branch zip before it is merged) and double-click it in Downloads to unzip.
2. In Chrome open `https://www.sec.gov/files/company_tickers_exchange.json`, press Cmd+S and save it into Downloads (the SEC's list page refuses scripts but not browsers). The helper finds it by itself.
3. Open Terminal and run: `bash ` then drag `scripts/mac-sync.sh` from the unzipped folder into the window, Enter.
4. First run only: Supabase project URL, then the Supabase secret key (hidden; never paste it in chat), then a contact email for the SEC. Wait 1-3 minutes for "Finished".
5. Re-run whenever you want newer data or to add companies visitors asked for. Safe to repeat.
