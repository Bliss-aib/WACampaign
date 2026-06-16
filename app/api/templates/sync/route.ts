// FEATURE (Template sync): full reconcile against the connected WABA.
//
// Templates are scoped to the WhatsApp Business Account (waba_id). This endpoint
// pulls the live list from Meta and reconciles the local rows: adds missing
// templates, updates statuses, and demotes phantoms that no longer exist on the
// connected WABA (so the campaign UI stops offering templates Meta will reject
// with #132001). Outbound-only, so it works on localhost. Triggered by the
// "Sync with Meta" button on the Templates page (and automatically on connect).

import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getUserId, getOrCreateBusinessId } from "@/lib/auth";
import { syncTemplatesFromMeta } from "@/lib/submit-template";

async function getBusinessId(userId: string) {
  const { data } = await supabase.from("businesses").select("id").eq("user_id", userId).single();
  return data?.id;
}

export async function POST() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getOrCreateBusinessId(userId);

  const businessId = await getBusinessId(userId);
  if (!businessId) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const result = await syncTemplatesFromMeta(businessId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({
    success: true,
    added: result.added,
    updated: result.updated,
    demoted: result.demoted,
  });
}
