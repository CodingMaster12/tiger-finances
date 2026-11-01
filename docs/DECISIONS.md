# Decision log (owner answers and agreed choices)

| Topic | Decision |
|---|---|
| Audience | Multi-user from the start (all data scoped per user with RLS), personal use first |
| Auth | Email + password only. Email verification ON. Password reset ON. **No social login and no fake social buttons.** |
| Username | One unique username (case-insensitive), changeable **once every 14 days** (enforced by a DB trigger). First change is free |
| Theme | Discussed late, then "as is": **light only**. Dark tokens staged, no toggle. Revisit only if the owner asks |
| Look | PayPal-style fintech with lighter colours (navy + bright blue on cool greys) |
| Sync | Workspaces sync across devices through Supabase Postgres |
| Data providers | Free tiers only; research then propose the smallest combination. Canadian fundamentals coverage unverified |
| Hosting | Local first, then Vercel Hobby (free, non-commercial). Deployed at https://tiger-finances-six.vercel.app |
| Repo | `CodingMaster12/tiger-finances` (GitHub). Owner had no prior repo. Do not touch `akfromlaurier-create/website-` |
| Name | "Tiger Finances" (placeholder "Meridian" was replaced) |
| Scope order | Plan milestones 1–9 approved; ask before starting each |
| Account deletion | In scope: requires password + typed DELETE; uses `SUPABASE_SECRET_KEY` server-side |
| Canada data (2026-11-01) | **Option A**: full US data; Canadian companies get whatever the free tiers really return, clearly labelled. No unofficial sources, no paid plans. Free-plan facts so far are from vendor pages only (Twelve Data Basic: 800/day, 8/min, "internal non-display usage" wording to check against its terms; FMP Basic: 250/day, Canada reportedly paid). Real calls (AAPL, SHOP.TO, RY.TO) still to run once keys exist |
| Registration copy | Terms/privacy are not written; the form says "once they are published". Do not invent legal terms |

## Milestone history
1. Foundation (done): scaffold, tokens, UI kit, finance calculations + tests, shell, `/styleguide`.
2. Accounts (done, owner-verified live): schema + RLS + tests, auth flows, account settings, header menu, route protection.
Post-launch fixes made while deploying: pinned framework in `vercel.json` (404 fix), site-URL scheme tolerance, form values kept
after failed submit, hard redirects + session-keyed forms (stale red error), submit gated on all password rules, specific
weak-password messages.

## Things the owner asked for that shape future work
- "Simple and exact instructions", "excruciating detail", "very concise list" when they ask for steps. Match the requested length.
- Always remind them about decisions they deferred. None are currently open except those listed in `CLAUDE.md`.
- They are moving to a new Claude session/project; this repo is the memory. Keep these docs current as work progresses.
