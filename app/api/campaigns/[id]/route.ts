import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getUserId, getOrCreateBusinessId } from "@/lib/auth";
import { removeCampaignJob } from "@/lib/queue";
import { campaignStatusUpdateSchema } from "@/lib/validation";

async function getBusinessId(userId: string) {
  const { data } = await supabase.from("businesses").select("id").eq("user_id", userId).single();
  return data?.id;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getOrCreateBusinessId(userId);

  const businessId = await getBusinessId(userId);
  if (!businessId) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { id } = await params;

  const { data, error } = await supabase
    .from("campaigns")
    .select("*, templates(name)")
    .eq("id", id)
    .eq("business_id", businessId)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...data,
    templateName: data.templates?.name || "",
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getOrCreateBusinessId(userId);

  const businessId = await getBusinessId(userId);
  if (!businessId) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { id } = await params;

  // FIX (H2): validate status against an allow-list. Previously any string was
  // accepted, so a user could PATCH status:"sending"/"completed" and bypass the
  // queue/worker logic. Only user-settable states are permitted here.
  const parsed = campaignStatusUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid status", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { status } = parsed.data;

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("status")
    .eq("id", id)
    .eq("business_id", businessId)
    .single();

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // FIX (H3): the user-settable targets (cancelled/paused/draft) are all
  // non-scheduled, so if the campaign is currently 'scheduled' this PATCH always
  // moves it off the schedule — remove the queued BullMQ job so it doesn't still
  // fire at the scheduled time and send an unwanted campaign.
  if (campaign.status === "scheduled") {
    await removeCampaignJob(id);
  }

  const { data, error } = await supabase
    .from("campaigns")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("business_id", businessId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaign: data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getOrCreateBusinessId(userId);

  const businessId = await getBusinessId(userId);
  if (!businessId) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { id } = await params;

  await removeCampaignJob(id);

  const { error } = await supabase.from("campaigns").delete().eq("id", id).eq("business_id", businessId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
