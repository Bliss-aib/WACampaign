// FEATURE (Option A): On-demand template status sync from Meta.
//
// Outbound call (server -> Meta), so it works on localhost where the inbound
// approval webhook can't reach. Triggered by the "Refresh status" button on the
// Templates page. Also useful in production as a manual fallback if a webhook
// delivery is missed.

import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getUserId, getOrCreateBusinessId } from "@/lib/auth";
import { refreshTemplateStatuses } from "@/lib/submit-template";

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

  const result = await refreshTemplateStatuses(businessId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, updated: result.updated });
}
