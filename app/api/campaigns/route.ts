import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { scheduleCampaign, removeCampaignJob } from "@/lib/queue";

export async function GET(req: Request) {
  const userId = "dev-user";

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!business) return NextResponse.json({ campaigns: [] });

  let query = supabase
    .from("campaigns")
    .select("*, templates(name)")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const campaigns = (data || []).map((c: any) => ({
    ...c,
    templateName: c.templates?.name || "",
    templates: undefined,
  }));

  return NextResponse.json({ campaigns });
}

export async function POST(req: Request) {
  const userId = "dev-user";

  const { name, templateId, contactIds, scheduledAt } = await req.json();

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  // Insert campaign
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      business_id: business.id,
      template_id: templateId,
      name,
      status: scheduledAt ? "scheduled" : "draft",
      scheduled_at: scheduledAt || null,
      total_contacts: contactIds.length,
    })
    .select()
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json({ error: campaignError?.message || "Failed" }, { status: 500 });
  }

  // Insert campaign_contacts
  const rows = contactIds.map((contactId: string) => ({
    campaign_id: campaign.id,
    contact_id: contactId,
    status: "pending",
  }));

  const { error: junctionError } = await supabase.from("campaign_contacts").insert(rows);
  if (junctionError) {
    return NextResponse.json({ error: junctionError.message }, { status: 500 });
  }

  // Schedule if needed
  if (scheduledAt) {
    await scheduleCampaign(campaign.id, new Date(scheduledAt));
  }

  return NextResponse.json({ campaign });
}
