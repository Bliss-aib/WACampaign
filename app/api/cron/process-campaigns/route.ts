import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { sendCampaign } from "@/lib/send-campaign";

// This endpoint is NOT user-facing. Supabase pg_cron calls it every minute via
// pg_net. It finds due campaigns (scheduled time reached, or mid-send with
// pending contacts) and sends a bounded batch for each — so a single serverless
// invocation never exceeds the function time limit. Larger campaigns drain over
// successive ticks.
//
// Protected by CRON_SECRET: the cron job sends `Authorization: Bearer <secret>`.

export const dynamic = "force-dynamic";
export const maxDuration = 60; // seconds; bounded batches keep us well under this

// Campaigns processed per tick, and contacts sent per campaign per tick.
const MAX_CAMPAIGNS_PER_RUN = 10;
const MAX_CONTACTS_PER_CAMPAIGN = 25;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // refuse if not configured
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

async function run() {
  const nowIso = new Date().toISOString();

  // Due = scheduled and the time has arrived, OR already 'sending' (a previous
  // tick didn't finish all contacts). scheduled_at is always set for these.
  const { data: due } = await supabase
    .from("campaigns")
    .select("id")
    .in("status", ["scheduled", "sending"])
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(MAX_CAMPAIGNS_PER_RUN);

  const results = [];
  for (const c of due || []) {
    try {
      results.push(await sendCampaign(c.id, MAX_CONTACTS_PER_CAMPAIGN));
    } catch (e: any) {
      results.push({ campaignId: c.id, processed: 0, status: "error", reason: e?.message });
    }
  }
  return results;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const campaigns = await run();
  return NextResponse.json({ ran: new Date().toISOString(), campaigns });
}

// Some cron triggers issue GET — accept it with the same auth.
export async function GET(req: Request) {
  return POST(req);
}
