# Production Deployment (Vercel + Supabase only)

No Redis, no separate worker host. Two services:

| Piece | What it does | Where |
|---|---|---|
| **Web app + API** (Next.js) | Dashboard, API routes, **and the campaign sender** (`/api/cron/process-campaigns`). | **Vercel** |
| **Database + scheduler** | Postgres data, RLS, and **`pg_cron`** which pings the sender every minute via **`pg_net`**. | **Supabase** (hosted) |

## How sending works now

1. Creating a campaign just inserts a row with `status='scheduled'` and a
   `scheduled_at` time (no schedule = send now).
2. **Supabase `pg_cron`** runs every minute and calls
   `POST /api/cron/process-campaigns` (via `pg_net`), authenticated with a
   `CRON_SECRET` bearer token.
3. That endpoint finds campaigns whose `scheduled_at` has passed (or are mid-send)
   and sends a **bounded batch** of contacts per call, so it never exceeds the
   Vercel function time limit. Large campaigns drain over successive minutes.

Timing precision is ~1 minute, which is fine for scheduled marketing sends. This
works on **Vercel Hobby** (no Pro required) because the timer lives in Supabase.

---

## 1. Vercel env vars

**Settings → Environment Variables** (Production):

| Variable | Notes |
|---|---|
| `SUPABASE_URL` | `https://gmpzrnzuiejqzvxuonnj.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only |
| `NEXT_PUBLIC_SUPABASE_URL` | browser/SSR |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser/SSR |
| `ENCRYPTION_KEY` | encrypts the stored Meta token — **set a real value** |
| `AUTH_ENABLED` / `NEXT_PUBLIC_AUTH_ENABLED` | `true` |
| `CLERK_*` (publishable + secret) | auth |
| `META_APP_SECRET` | required in prod — the webhook rejects unsigned requests |
| `META_WEBHOOK_VERIFY_TOKEN` | webhook handshake |
| `CRON_SECRET` | **must equal** the secret stored in Supabase (step 2). The sender rejects calls without it. |
| `META_GRAPH_VERSION` | optional, defaults to `v18.0` |
| `AI_PROVIDER` / `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | optional |

Redeploy after changing env vars.

### Meta webhook
- Callback: `https://<your-vercel-domain>/api/webhooks/meta`, verify token =
  `META_WEBHOOK_VERIFY_TOKEN`. Subscribe to `messages` and
  `message_template_status_update`.

---

## 2. Supabase scheduler (one-time SQL)

Run this once in the Supabase **SQL Editor** (replace `<CRON_SECRET>` with the
same value you put in Vercel, and the URL with your domain). It enables the
extensions, stores the secret in Vault, and schedules the per-minute call.

```sql
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- store the shared secret in Vault (encrypted at rest)
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'cron_secret') then
    perform vault.create_secret('<CRON_SECRET>', 'cron_secret', 'Bearer token for /api/cron/process-campaigns');
  end if;
end $$;

-- call the sender every minute
select cron.schedule(
  'process-campaigns',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://<your-vercel-domain>/api/cron/process-campaigns',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'),
      'Content-Type', 'application/json'
    )
  );
  $$
);
```

Useful management queries:

```sql
-- see the schedule
select * from cron.job where jobname = 'process-campaigns';
-- see recent runs
select * from cron.job_run_details order by start_time desc limit 20;
-- pause / resume
select cron.unschedule('process-campaigns');
```

---

## 3. Verify end-to-end

1. **Settings** → connect WhatsApp (paste sample-app token, WABA id, phone id).
2. **Templates** → create → submit to Meta → wait for **Approved**.
3. **Contacts** → add your verified test number.
4. **Campaigns → New** → pick the template + contact → schedule ~1–2 min out.
5. Within a couple of minutes the message lands on WhatsApp and the campaign's
   sent count increments. Check `cron.job_run_details` if nothing happens.

### Troubleshooting

| Symptom | Cause |
|---|---|
| Campaign stays **scheduled**, never sends | Cron not scheduled, or `CRON_SECRET` differs between Supabase Vault and Vercel (endpoint 401s). Check `cron.job_run_details`. |
| Every contact **failed** instantly | Template not `approved`, or WhatsApp not connected. |
| Connect shows **"ENCRYPTION_KEY missing"** | Set `ENCRYPTION_KEY` in Vercel. |
| Webhook **401s** | Set `META_APP_SECRET` in Vercel. |
| Big campaign sends slowly | Expected — it drains ~25 contacts/minute by design. Adjust the batch size in `app/api/cron/process-campaigns/route.ts` if needed. |
