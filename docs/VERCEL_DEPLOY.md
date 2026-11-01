# Deploy Tiger Finances on Vercel

Hobby plan is free but **non-commercial, personal use only** (see Vercel's fair-use guidelines).
Labels marked *(may differ)* were not confirmed against Vercel's current dashboard.

## 0. Prerequisite
The code must be in a GitHub repository (this one). Vercel deploys from GitHub.

## 1. Account
vercel.com → **Sign Up** → Hobby plan → **Continue with GitHub**.

## 2. Import
1. vercel.com/new (or **Add New… → Project**), find this repo, **Import**.
   If it isn't listed: **Adjust GitHub App Permissions** *(may differ)* and allow the repo.
2. **Project Name:** `tiger-finances`. **Framework Preset:** Next.js. Leave Root Directory and build settings alone.
3. Do not click Deploy yet.

## 3. Environment variables (Configure Project → Environment Variables)
| Key | Value | Type |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | Config |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` | Config |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` | **Secret** |

Leave Production, Preview and Development ticked. Do not add `NEXT_PUBLIC_SITE_URL` yet.

## 4. Deploy
Click **Deploy**, wait 1–3 minutes, copy the address under **Domains**.

## 5. Site address, then redeploy
Variable changes only apply to new deployments.
1. **Settings → Environment Variables**: add `NEXT_PUBLIC_SITE_URL` = your address (no trailing slash).
2. **Deployments** → newest row → **⋯ → Redeploy**.

## 6. Supabase
**Authentication → URL Configuration**: set **Site URL** to the Vercel address; add Redirect URL
`<address>/**`; keep `http://localhost:3000/**`. Save.

## 7. Check
Open the address in a private window. The "accounts aren't configured" banner on `/register` should be gone.
Register with your Supabase account email (free email sender is limited) and confirm via the email link.

## Troubleshooting
| Problem | Fix |
|---|---|
| 404 NOT_FOUND on the Vercel address | The imported repo doesn't contain the app, or no production deployment succeeded. Check **Settings → Git** and the **Deployments** build log. |
| Asked to log in to Vercel | Deployment Protection is on: **Settings → Deployment Protection** *(may differ)*. |
| "Not configured" banner | Variable missing or misspelled. Fix, then Redeploy. |
| Email link opens localhost | `NEXT_PUBLIC_SITE_URL` or Supabase Site URL is stale. |
| Preview-branch sign-in fails | Preview addresses aren't in Supabase's Redirect URLs. |
