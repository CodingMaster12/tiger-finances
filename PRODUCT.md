# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: self-directed investors researching US and Canadian public companies before buying or holding them, checking whether the business is financially healthy. (Confirmed by the owner.)

The owner is the product owner and is not a developer. The product starts as personal use and is built multi-user from day one (accounts, saved workspaces, per-user data isolation).

## Product Purpose

An equity research web app: search a company, read its financial statements and trends, compare 2 to 3 companies, and keep watchlists, saved comparisons and notes in a personal workspace that syncs across devices.

A successful visit is any of three (confirmed by the owner): a fast answer about a company's financial health, a deep session comparing companies and reading statements, and a saved workspace the user returns to.

## Positioning

Every number is traceable (confirmed by the owner). Each figure carries its source filing, period and currency, says whether it was reported or calculated, and gaps read "not available" instead of being guessed or filled in. A neighbouring free stock site that blends sources or hides provenance could not truthfully make this claim.

## Operating Context

- Financial data comes only from SEC EDGAR (free, reusable, no key): annual and quarterly income statement, balance sheet and cash flow, in each company's own reporting currency (a Canadian bank stays in CAD).
- Live today: accounts (register, email confirmation, sign-in, password reset, profile, preferences) on Supabase, hosted on Vercel at https://tiger-finances-six.vercel.app (Vercel Hobby, non-commercial).
- Built but not yet shown on pages: the SEC data layer (statements, key metrics, ticker search).

## Capabilities and Constraints

- **No price data for now** (owner decision): no price chart, market cap, P/E, P/S, P/B, EV/EBITDA or dividend yield until a source whose terms allow public display is found. Interfaces must not imply prices exist.
- Coverage is limited to SEC filers. Canadian companies that do not file with the SEC are "not covered" and say so. Banks and insurers do not show gross profit, operating income or capex.
- Free tiers only; no paid services without the owner's explicit approval. Several free data providers were ruled out because their terms forbid public display.
- Never fabricate or silently replace financial data. Calculated values (free cash flow, derived quarters, margins) are labelled as calculated.
- Accounts: email and password only, no social login and no fake social buttons. Username is unique and can be changed once every 14 days. No terms or privacy pages written yet; the register form says "once they are published".
- Stack in place: Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, Recharts (installed, unused), Supabase, Vercel.
- Roadmap: search and company overview, statements with trend charts, comparison, watchlists and notes, visual QA and accessibility, delivery. The owner approves each milestone before it starts.

## Brand Commitments

- Product name: **Tiger Finances** (owner's choice).
- Visual direction is changing. The owner supplied a reference image of a dark, amber-lit, futuristic interface (an "Echo" concept) as the type of design they want. The earlier decisions of "PayPal-style, lighter colours, light theme only" are superseded by this. The rest of the visual world is undecided and belongs to the design phase, not this record.
- **Colour palette (owner's binding instruction, 2026-11-08):** gold with a hint of orange as the main colour, with green as a thin "lining" used sparingly for minor accents and for text. Exact values, light/dark treatment and how gains and losses are shown are undecided.

## Evidence on Hand

- Real SEC data fixtures (trimmed) for Apple, Shopify and Royal Bank of Canada under `src/lib/sec/__fixtures__`, and 127 passing unit tests.
- No testimonials, customers, usage numbers or press. Future work must not invent any.
- The current UI is a design-system kit (`/styleguide`), a placeholder home page and working account pages, in a light, blue-and-grey theme.

## Product Principles

1. Traceability over polish of claims: every number shows where it came from, and honesty about gaps is a feature.
2. Never imply data we do not have: no prices, no unsupported companies, no decorative numbers.
3. Fast to the answer, deep on demand: a quick read of financial health first, statements and comparison for those who want more.
4. A workspace worth returning to: saved items must persist reliably and feel like the user's own.
5. Free and legal by construction: only data sources whose terms allow public display.

## Accessibility & Inclusion

No product-specific standard has been set. Defaults from the spec apply: semantic HTML, labelled forms, keyboard use, visible focus and sufficient contrast. Positive and negative values must never rely on colour alone.
