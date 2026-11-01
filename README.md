# Tiger Finances

Creating a financial analysis that focuses on business analysis which is used by possible investors/day-traders.

Equity research workspace for US and Canadian public companies, built with Next.js, TypeScript, Tailwind and Supabase.

## Status
- **Done:** design system and UI kit, tested financial calculations, accounts (register, login, password reset,
  settings, unique usernames changeable once every 14 days), row-level security.
- **Not yet verified:** live sign-up and login against a real Supabase project.
- **Not built yet:** data providers, company search and research pages, comparison, watchlists and notes.

See [docs/NEXT_STEPS.md](docs/NEXT_STEPS.md) for the owner checklist.

## Setup
1. Supabase: [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)
2. Local env: copy `.env.example` to `.env.local` and fill it in. Never commit real keys.
3. Deploy: [docs/VERCEL_DEPLOY.md](docs/VERCEL_DEPLOY.md)

## Develop
```bash
npm install
npm run dev         # http://localhost:3000
npm run lint
npm run typecheck
npm test            # unit tests (Vitest)
npm run test:db     # applies migrations to a throwaway local Postgres and runs the RLS tests
npm run build
```

## Layout
- `supabase/migrations/` database schema and row-level security
- `supabase/tests/` database tests (RLS, ownership, username cooldown)
- `src/proxy.ts` session refresh and route protection (the database is the real authority)
- `src/lib/finance/` pure, tested financial calculations
- `src/components/ui/` design-system components; tokens in `src/app/globals.css`
- `/styleguide` visual reference

Theme: light only for now (dark tokens are staged, no setting yet).
