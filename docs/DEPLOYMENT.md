# Production Deployment

WACampaign has **three** runtime pieces. Vercel alone cannot run all of them
because the campaign sender is a long-lived background process.

| Piece | What it does | Where it runs |
|---|---|---|
| **Web app** (Next.js) | Dashboard + API routes. Creates campaigns and enqueues jobs. | **Vercel** |
| **Database + Auth data** | Postgres tables, RLS. | **Supabase** (hosted) |
| **Campaign worker** (BullMQ) | Pulls scheduled jobs from Redis and sends WhatsApp messages. | **Worker host** (Render / Railway / Fly) |
| **Queue** (Redis) | Holds scheduled/delayed campaign jobs. | **Managed Redis** (Upstash) |

> The web app **enqueues** a job when a campaign is created/scheduled. The
> **worker** is what actually sends. With no worker running, campaigns sit in the
> queue and never send. This guide wires up the worker + Redis.

---

## 1. Managed Redis (Upstash)

1. Create a free database at <https://upstash.com> → **Redis**.
2. Pick a region close to your worker host.
3. Copy the **`rediss://` (TLS) connection string** from the dashboard. This is
   your `REDIS_URL` (used by **both** Vercel and the worker host).
   - `ioredis` auto-enables TLS for `rediss://` URLs.
   - The app sets `family: 0` so it works on IPv6-only host networks.

## 2. Hosted Supabase

Already set up (project `gmpzrnzuiejqzvxuonnj`). Make sure migrations `001`–`009`
are applied (they are). You need:
- `SUPABASE_URL` = `https://<ref>.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` (Settings → API)

## 3. The shared `ENCRYPTION_KEY` ⚠️

The web app encrypts the Meta access token; the worker decrypts it to send.
**`ENCRYPTION_KEY` must be the exact same value in Vercel and on the worker
host.** If they differ, the worker can't decrypt the token and every send fails.
Generate one strong key and reuse it everywhere:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 4. Deploy the worker

Pick one host. Both read the same env vars (section 6).

### Option A — Render (Blueprint, included)

This repo ships `render.yaml` defining a **background worker**.

1. Render → **New → Blueprint** → connect this repo.
2. It detects `wacampaign-worker` (type: worker). Background workers require a
   paid plan (Starter).
3. After it provisions, open the service → **Environment** and fill the
   `sync:false` vars (`REDIS_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `ENCRYPTION_KEY`). `META_GRAPH_VERSION` is pre-set.
4. Deploy. Logs should show `Campaign worker started`.

### Option B — Railway

This repo ships a `Procfile` (`worker: npm run worker`).

1. Railway → **New Project → Deploy from GitHub repo**.
2. In the service settings, set **Start Command** to `npm run worker` (or let the
   Procfile drive it). Build command: `npm ci`.
3. Add the env vars from section 6 under **Variables**.
4. Deploy. Logs should show `Campaign worker started`.

> The worker is **not** a web server — it has no HTTP port. Don't add a health
> check that expects an open port.

---

## 5. Deploy the web app (Vercel)

1. Import the repo into Vercel (root, Next.js auto-detected).
2. Add the env vars (section 6) under **Settings → Environment Variables**.
   Vercel also needs `REDIS_URL` so the API can enqueue jobs.
3. Redeploy after any env change (env changes need a fresh build).

### Meta webhook (after the app has a public URL)

- In the Meta App dashboard, set the webhook callback to
  `https://<your-vercel-domain>/api/webhooks/meta` and the verify token to your
  `META_WEBHOOK_VERIFY_TOKEN`.
- Set `META_APP_SECRET` in Vercel — in production the webhook **rejects**
  unsigned requests (it only skips verification in non-production).

---

## 6. Environment variables matrix

| Variable | Vercel (web) | Worker host | Notes |
|---|:---:|:---:|---|
| `REDIS_URL` | ✅ | ✅ | Upstash `rediss://` URL |
| `SUPABASE_URL` | ✅ | ✅ | |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ✅ | server-only, never expose to browser |
| `ENCRYPTION_KEY` | ✅ | ✅ | **must be identical on both** |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | — | browser/SSR |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | — | browser/SSR |
| `AUTH_ENABLED` / `NEXT_PUBLIC_AUTH_ENABLED` | ✅ | — | `true` in prod |
| `CLERK_*` (publishable + secret) | ✅ | — | auth |
| `META_APP_SECRET` | ✅ | — | required in prod for webhook signature |
| `META_WEBHOOK_VERIFY_TOKEN` | ✅ | — | webhook handshake |
| `META_GRAPH_VERSION` | optional | optional | defaults to `v18.0` |
| `AI_PROVIDER` / `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | optional | — | template generation |

---

## 7. Verify the full path

1. Connect WhatsApp in **Settings** (paste the sample-app token, WABA id, phone
   number id).
2. Create & approve a template (Templates page → submit to Meta).
3. Add a contact (your verified test number).
4. Create a campaign scheduled for ~1 minute out.
5. Watch the worker logs — you should see `Campaign <id> completed`, the message
   should arrive on WhatsApp, and the campaign's sent count should increment.

### Troubleshooting

- **Campaign stuck in `scheduled` / `draft`** → the worker isn't running or can't
  reach Redis. Check worker logs and that `REDIS_URL` matches on both sides.
- **Every send fails right away** → `ENCRYPTION_KEY` differs between Vercel and
  the worker (token can't be decrypted), or the template isn't `approved`.
- **Contacts stuck in `sending`** → the worker was killed mid-send. They are not
  auto-resent (to avoid duplicates); reset them to `pending` to retry.
- **Webhook 401s in prod** → `META_APP_SECRET` not set in Vercel.
