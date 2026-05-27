# Authentication Setup — Google Sign-in (Supabase Auth)

This app uses **Supabase Auth** with **Google OAuth** so Gmail users can log in.
All auth code is gated by an `AUTH_ENABLED` flag, so the app runs without login
until you switch it on.

---

## How the flag works

| `AUTH_ENABLED` | Behaviour |
|---|---|
| `false` (default) | No login required. Every request acts as the legacy `dev-user`. Use this while testing without Google credentials. |
| `true` | Real Google login is enforced. Dashboard routes redirect logged-out users to `/sign-in`. |

Set it in `.env.local` (server) **and** `NEXT_PUBLIC_AUTH_ENABLED` (browser) to the same value.

---

## Google Cloud Console — step by step

You create **one** OAuth client for the whole WACampaign platform. This is a
one-time setup, not something done per customer (see "Scaling" below).

> Google recently reorganized this area into **"Google Auth Platform"**. Both the
> new and classic menu paths are noted below.

### 1. Create / select a project
1. Go to <https://console.cloud.google.com>.
2. Top bar → project dropdown → **New Project** → name it `WACampaign` → **Create**.
3. Make sure it's selected in the top bar.

### 2. Configure the OAuth consent screen
**APIs & Services → OAuth consent screen** (new UI: **Google Auth Platform → Branding / Audience**).
1. App name: `WACampaign`; user support email: your email; **Audience = External**;
   developer contact email → **Save**.
2. **Audience** tab → keep **Publishing status = Testing** for now → under
   **Test users**, **+ Add users** → add your Gmail (and any spare Gmails for
   multi-account testing) → **Save**.
3. Scopes: none needed — Supabase uses only the default `email`, `profile`,
   `openid` (non-sensitive).

### 3. Create the OAuth client ID
**APIs & Services → Credentials** (new UI: **Google Auth Platform → Clients**).
1. **+ Create Credentials → OAuth client ID**.
2. **Application type: Web application**; name: `WACampaign Web`.
3. **Authorized JavaScript origins** (optional, recommended): `http://localhost:3100`
   (add the production domain later).
4. **Authorized redirect URIs** — the critical field. Point at **Supabase**, not the app:
   - Local: `http://127.0.0.1:54321/auth/v1/callback`
   - Production (add later): `https://<project-ref>.supabase.co/auth/v1/callback`
5. **Create** → copy the **Client ID** (`…apps.googleusercontent.com`) and
   **Client Secret** (`GOCSPX-…`).

### Common gotchas
| Field | Must be | Why |
|---|---|---|
| Redirect URI | `http://127.0.0.1:54321/auth/v1/callback` | Points at Supabase (port 54321), **not** the app on `:3100`. Exact match — scheme, host, path. |
| Host | `127.0.0.1` (not `localhost`) | Matches this project's Supabase config. |
| Audience | External | So any Gmail (not just your org) can sign in. |

### Scaling — no per-customer setup
The "test users" list only applies while the consent screen is in **Testing** mode.
Once you **Publish app** (Testing → In production), **any Gmail user can sign in
automatically** — they are never added anywhere. The one-time work is: create the
OAuth client + publish the consent screen. Login only uses non-sensitive scopes, so
Google does not require its full verification review (a one-time brand verification
only removes the cosmetic "unverified app" screen).

---

## A. LOCAL setup (Docker Supabase, for testing)

1. **Create Google OAuth credentials** in [Google Cloud Console](https://console.cloud.google.com):
   - APIs & Services → OAuth consent screen → **External** → add your Gmail as a **test user**.
   - Credentials → Create Credentials → **OAuth client ID** → **Web application**.
   - **Authorized redirect URI** (exact):
     ```
     http://127.0.0.1:54321/auth/v1/callback
     ```
   - Copy the **Client ID** and **Client Secret**.

2. **Provide the credentials to the local Supabase stack.** Create `supabase/.env`:
   ```
   SUPABASE_AUTH_GOOGLE_CLIENT_ID=<your client id>
   SUPABASE_AUTH_GOOGLE_SECRET=<your client secret>
   ```
   (The CLI substitutes these into `config.toml`'s `[auth.external.google]` block.)

3. **Enable the provider** in `supabase/config.toml`:
   ```toml
   [auth.external.google]
   enabled = true
   ```

4. **Add the same values to the app** in `.env.local`:
   ```
   AUTH_ENABLED=true
   NEXT_PUBLIC_AUTH_ENABLED=true
   ```

5. **Restart the local Supabase stack** (config changes need a restart):
   ```
   npx supabase stop
   npx supabase start
   ```

6. **Restart the dev server** (`npx next dev -p 3100`) and open http://localhost:3100/sign-in.

> First Gmail login automatically inherits the existing `dev-user` test data
> (templates, contacts, campaigns). Each additional Gmail account gets its own
> fresh, separate workspace.

---

## B. PRODUCTION setup (client's hosted Supabase on supabase.com)

Do **not** edit `config.toml` for the hosted project — use the dashboard.

1. **Google Cloud**: add a second **Authorized redirect URI** to the same (or a
   production) OAuth client:
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
   (Move the OAuth consent screen from "Testing" to "In production" so any Gmail
   user — not just listed test users — can sign in.)

2. **Supabase dashboard** (the client's project):
   - **Authentication → Providers → Google** → enable, paste Client ID + Secret.
   - **Authentication → URL Configuration** →
     - Site URL: your Vercel domain (e.g. `https://wacampaign.vercel.app`)
     - Redirect URLs: add `https://<your-vercel-domain>/auth/callback`

3. **Apply the database migrations** to the hosted project (they hold the schema
   this app needs). Either link and push with the CLI:
   ```
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```
   …or run the SQL from `supabase/migrations/*.sql` in the dashboard SQL editor,
   in filename order (001 → 006).

4. **Vercel environment variables** (Project → Settings → Environment Variables):
   ```
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<hosted service role key>
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<hosted anon key>
   AUTH_ENABLED=true
   NEXT_PUBLIC_AUTH_ENABLED=true
   ENCRYPTION_KEY=<32-char production key>
   META_APP_SECRET=<from Meta>
   META_WEBHOOK_VERIFY_TOKEN=<your token>
   REDIS_URL=<production Redis URL>
   OPENAI_API_KEY=<optional>
   ```

5. Redeploy. Visit `/sign-in` on the live domain and confirm Google login works.

---

## Files involved (for the dev team)

| File | Role |
|---|---|
| `lib/supabase/browser.ts` | Browser auth client (starts Google OAuth) |
| `lib/supabase/server.ts` | Cookie-aware server auth client |
| `lib/auth.ts` | `getUserId()`, `getOrCreateBusinessId()`, `AUTH_ENABLED` gate |
| `proxy.ts` | Session refresh + protects dashboard routes (Next 16 "proxy" convention) |
| `app/(auth)/sign-in/page.tsx` | "Sign in with Google" button |
| `app/auth/callback/route.ts` | Exchanges the OAuth code for a session |
| `components/layout/header.tsx` | Sign-out action |
| `app/api/**/route.ts` | All use `getUserId()` instead of a hardcoded user |
