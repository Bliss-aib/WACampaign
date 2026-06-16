import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getUserId, getOrCreateBusinessId } from "@/lib/auth";

async function getBusinessId(userId: string) {
  const { data } = await supabase.from("businesses").select("id").eq("user_id", userId).single();
  return data?.id;
}

/**
 * FEATURE: Start a campaign immediately from the dashboard.
 *
 * - Draft/scheduled/paused campaigns are set to send now.
 * - The Supabase cron sender (/api/cron/process-campaigns) picks up campaigns
 *   whose scheduled_at has passed and processes them.
 * - Campaigns already in terminal/progress states cannot be restarted.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getOrCreateBusinessId(userId);

  const businessId = await getBusinessId(userId);
  if (!businessId) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { id } = await params;

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("status")
    .eq("id", id)
    .eq("business_id", businessId)
    .single();

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!["draft", "scheduled", "paused"].includes(campaign.status)) {
    return NextResponse.json(
      { error: `Cannot start a campaign that is already ${campaign.status}` },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("campaigns")
    .update({ status: "scheduled", scheduled_at: now, updated_at: now })
    .eq("id", id)
    .eq("business_id", businessId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ campaign: data });
}
