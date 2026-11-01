# Supabase setup, step by step

This takes about 15 minutes and costs nothing. You will create a free Supabase project, create the
database tables, configure sign-in, copy three values, and give them to the app.

**Rules for secrets (read first)**
- Never paste a key or password into the chat with Claude, a GitHub issue, or any document.
- The **Publishable key** and **Project URL** are designed to be public. The **Secret key** is not: anyone
  with it can read and delete every user's data. Treat it like a bank password.

> **A note on accuracy.** Supabase changes its dashboard labels now and then. Where a label below was
> checked against Supabase's current documentation it is written exactly. Where it comes from experience and
> might differ slightly, it is marked *(label may differ)*. If something doesn't match what you see on screen,
> take a screenshot (with keys hidden) and ask. Don't guess.

---

## Part 1. Create a Supabase account

1. Open **https://supabase.com** in your browser.
2. Click **Sign in** (top right), then **Sign up now** if you have no account.
3. Choose **Continue with GitHub** or enter an email and password. If you use email, open the
   confirmation email Supabase sends and click the link.
4. If asked to create an **organization**, accept the default name (for example "Personal") and choose the
   **Free** plan. Click **Create organization**.

## Part 2. Create the project

1. On the dashboard, click **New project**.
2. Fill in the form:
   - **Organization:** the one you just created.
   - **Project name:** `tiger-finances`
   - **Database password:** click **Generate a password**, then click the copy icon and save it in a
     password manager. The app does not use this password, but you will need it if you later connect
     directly to the database. It can be reset later, but not recovered.
   - **Region:** choose the one closest to your users. For US and Canadian users, **East US (North Virginia)**
     or **Canada (Central)** are sensible.
   - **Pricing plan:** if shown, make sure it says **Free**. Do **not** add a payment method or enable
     paid add-ons.
3. Click **Create new project**. Wait 1–3 minutes until the setup screen finishes and the project home appears.

## Part 3. Create the database tables

1. In the left sidebar, click **SQL Editor** (the icon looks like `>_`).
2. Click **New query** (or the **+** button). A blank editor opens.
3. In the repository, open `supabase/migrations/20261025000001_profiles_and_preferences.sql`. Select all of
   its text (Ctrl+A, or Cmd+A on Mac) and copy it.
4. Paste it into the SQL Editor so it replaces whatever is there.
5. Click **Run** (bottom right) or press Ctrl+Enter / Cmd+Enter.
6. Expect a green result saying **Success. No rows returned**. If you see red text, copy the error message
   (it contains no secrets) and ask for help. Don't run the file a second time to "retry": the first run may
   have partly succeeded, and a second run would then fail with "already exists".

**Check that it worked**
1. Left sidebar → **Table Editor**.
2. You should see two tables in the `public` schema: **profiles** and **user_preferences**.
3. Click each. Near the top there should be an indicator that **RLS is enabled** (a "RLS enabled" label or a
   lock/shield icon). If you see "RLS disabled" or an "Enable RLS" button, stop and ask: it means the
   migration did not fully apply.

## Part 4. Configure sign-in

### 4a. Site URL and redirect URLs
These control where Supabase is allowed to send people from email links.

1. Left sidebar → **Authentication**.
2. Open **URL Configuration** *(label confirmed by Supabase docs; it may sit under a "Configuration" group)*.
3. **Site URL:** enter the address where the app runs.
   - Running on your own computer: `http://localhost:3000`
   - Once deployed, change this to the real address, e.g. `https://your-app.vercel.app`
4. Under **Redirect URLs**, click **Add URL** and add each of these, one at a time:
   - `http://localhost:3000/**`
   - your deployed address followed by `/**` (when you have one)
5. Click **Save changes**.

### 4b. Email sign-in
1. **Authentication** → **Sign In / Providers** *(label may differ; older dashboards say "Providers")*.
2. Click **Email** to expand it.
3. Make sure **Enable Email provider** is **on**.
4. **Confirm email:** leave this **on**. It makes new users prove they own the address. It is on by default
   for hosted projects.
5. If there is a **Minimum password length** field *(label may differ)*, set it to **10** so the database
   matches the app's rule. The app already enforces 10 characters itself, so this is optional.
6. Click **Save**.
7. Leave every social provider (Google, GitHub, and so on) **off**. The app has no social login.

### 4c. Email templates
Nothing to change. The default confirmation and password-reset emails work with this app as they are
(under **Authentication** → **Email Templates**, if you want to look).

## Part 5. Copy your three values

**Project URL**
1. Click **Connect** at the top of the dashboard (or **Project Settings** → **API**).
2. Copy the **Project URL**. It looks like `https://abcdefghijklmnop.supabase.co`.

**Publishable key** (safe to expose)
1. **Project Settings** (gear icon, bottom of the sidebar) → **API Keys**.
2. If you see no publishable key, click **Create new API Keys**.
3. Under **Publishable key**, copy the value that starts with `sb_publishable_`.

**Secret key** (private)
1. On the same **API Keys** page, find **Secret keys**.
2. If none exist, click **New secret key** and accept the default name.
3. Click the eye/reveal icon, then copy the value that starts with `sb_secret_`.
4. Paste it only into the places described in Part 6.

> Supabase also shows older "anon" and "service_role" keys. This app does not use them. Ignore those.

## Part 6. Give the values to the app

The app reads four environment variables:

| Variable | Value | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | the Project URL | no |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the `sb_publishable_…` key | no |
| `SUPABASE_SECRET_KEY` | the `sb_secret_…` key | **yes** |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` (or your deployed address) | no |

**If you are working in a Claude Code cloud session (the web or mobile app)**
1. In the session title bar, open the cloud **environment** menu, then click **Edit**.
2. Add the four variables above. Put `SUPABASE_SECRET_KEY` under **Network secrets** (also labelled
   **API credentials** in some app versions) if that section is offered, otherwise add it as an environment variable.
3. Save. **Start a new session**: an already-running session does not pick up changes.
4. Tell Claude "the variables are set". Don't paste the values.

**If you run the app on your own computer**
1. In the project folder, copy `.env.example` to a new file named `.env.local`.
2. Fill in the four values and save. `.env.local` is git-ignored and is never committed.
3. Run `npm install` then `npm run dev`, and open http://localhost:3000.

## Part 7. Email limits (important for testing)

On the free plan, Supabase sends emails through a shared built-in sender. As I understand it, that
sender is heavily rate-limited, and **may only deliver to addresses that belong to your Supabase organization's
team members**. I couldn't confirm the current numbers from the docs, so check **Authentication** → **Rate Limits**
*(label may differ)* and Supabase's SMTP documentation.

What that means for you:
- **While testing**, sign up with the same email address you used for your Supabase account. Confirmation
  and password-reset emails should arrive.
- If an email to another address never arrives, that is the likely reason. It's not a bug in the app.
- **Before real users sign up**, you need a custom SMTP provider (many have free tiers, for example
  Resend or Brevo). It's set under **Authentication** → **SMTP Settings** *(label may differ)*. Ask me and I
  will walk you through it.
- A quick alternative for testing only: turn **Confirm email** off (Part 4b). Sign-up then works instantly
  without email. Password reset still needs email. Turn it back on before launch.

## Part 8. Verify everything works

Do these in order, and tell me which step fails:
1. Open the app's `/register` page. The yellow "accounts aren't configured" banner should be **gone**.
2. Register with your Supabase account email, a username, and a password.
3. Open the confirmation email and click the link. You should land in **Account settings**.
4. In the Supabase dashboard: **Authentication** → **Users** shows your user, and **Table Editor** →
   **profiles** shows a row with your username.
5. Sign out from the account menu, then sign in again.
6. Refresh the page while signed in. You should stay signed in.
7. On `/account`, change your display name. Then change your username, and try to change it a second
   time. You should be blocked with a message giving the date the next change is allowed.
8. Use **Forgot password?** on the login page, open the email, set a new password, and sign in with it.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Yellow "not configured" banner still shows | Variables not set in the *new* session, or the dev server wasn't restarted. |
| "Invalid or expired link" after clicking an email | Open the link in the **same browser** you requested it from, and use it once. For sign-up confirmation, the email may already be confirmed, so try signing in. |
| No email arrives | See Part 7. Also check spam. |
| "Too many sign-up emails" | The built-in sender's rate limit. Wait, or set up custom SMTP. |
| Redirected to the wrong address after clicking an email link | **Site URL** or **Redirect URLs** in Part 4a don't match the address you're using. |
| Account deletion says "not configured" | `SUPABASE_SECRET_KEY` is missing. |
| Project says "paused" | Free projects pause after a week of inactivity. Open the dashboard and click **Restore project**. |
