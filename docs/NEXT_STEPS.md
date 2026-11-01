# Status and what the owner must do

## Done (code, committed)
- Milestone 1: scaffold, design tokens, UI kit, tested finance calculations.
- Milestone 2: accounts, profiles, unique usernames (change once per 14 days), settings, RLS.
- Tests: `npm test` (58), `npm run test:db` (35 database assertions incl. cross-user isolation).
- Live auth verified by the owner (register, confirm, login, reset, profile, password). Account deletion: not yet confirmed.
- Milestone 3 in progress: decision = Option A (see DECISIONS.md). Blocked on `TWELVE_DATA_API_KEY` and `FMP_API_KEY` in the cloud environment, then a NEW session. First task: real calls for AAPL, SHOP.TO, RY.TO and an honest coverage report before building adapters. Also check Twelve Data's terms on displaying data publicly.
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
5. Later milestones need free API keys (Twelve Data, Financial Modeling Prep) set the same way as step 2.

## Open items
- Theme: light only for now (dark tokens staged, no setting yet).
- Email: Supabase's free sender is limited; custom SMTP needed before real users.
