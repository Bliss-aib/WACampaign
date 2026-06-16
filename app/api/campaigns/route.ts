import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getUserId, getOrCreateBusinessId } from "@/lib/auth";
import { scheduleCampaign, startCampaignNow } from "@/lib/queue";
import { campaignCreateSchema } from "@/lib/validation";

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getOrCreateBusinessId(userId);

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
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getOrCreateBusinessId(userId);

  // FIX (H1/H9): validate the request body. Previously fields were destructured
  // untyped and `contactIds.length` crashed when it was missing/not an array.
  const parsed = campaignCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  // FEATURE (Option A): variableValues holds the values for non-name template
  // variables (e.g. { business, discount, code, link }), applied to every recipient.
  const { name, templateId, contactIds, scheduledAt, variableValues, immediate } = parsed.data;

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  // FIX (C3): verify the template belongs to THIS business. Without this a user
  // could reference another tenant's template id.
  const { data: ownedTemplate } = await supabase
    .from("templates")
    .select("id")
    .eq("id", templateId)
    .eq("business_id", business.id)
    .single();
  if (!ownedTemplate) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // FIX (C3): verify EVERY contact belongs to this business. We fetch the
  // matching rows scoped to the business and require the count to match the
  // requested ids — any foreign/invalid id makes the whole request fail.
  const { data: ownedContacts } = await supabase
    .from("contacts")
    .select("id")
    .eq("business_id", business.id)
    .in("id", contactIds);
  if (!ownedContacts || ownedContacts.length !== contactIds.length) {
    return NextResponse.json(
      { error: "One or more contacts do not belong to your account" },
      { status: 403 }
    );
  }

  // Insert campaign
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      business_id: business.id,
      template_id: templateId,
      name,
      status: immediate ? "scheduled" : scheduledAt ? "scheduled" : "draft",
      scheduled_at: immediate ? new Date().toISOString() : scheduledAt || null,
      total_contacts: contactIds.length,
      variable_values: variableValues || {}, // FEATURE (Option A)
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

  // Schedule or start immediately
  if (immediate) {
    await startCampaignNow(campaign.id);
  } else if (scheduledAt) {
    await scheduleCampaign(campaign.id, new Date(scheduledAt));
  }

  return NextResponse.json({ campaign });
}
