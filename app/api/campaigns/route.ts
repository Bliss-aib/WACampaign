import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getUserId, getOrCreateBusinessId } from "@/lib/auth";
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

  // FIX: the DB returns snake_case columns (sent_count, scheduled_at, …) but every
  // client consumer (CampaignsTable, the Analytics page, the Campaign type) expects
  // camelCase. Without mapping, the list's Stats column renders "//" and Scheduled
  // "—", and the Analytics page crashes on c.totalContacts.toLocaleString() (undefined).
  // Normalize to camelCase here, matching the contacts/dashboard routes.
  const campaigns = (data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    scheduledAt: c.scheduled_at,
    totalContacts: c.total_contacts,
    sentCount: c.sent_count,
    deliveredCount: c.delivered_count,
    readCount: c.read_count,
    failedCount: c.failed_count,
    templateName: c.templates?.name || "",
    createdAt: c.created_at,
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
  const { name, templateId, contactIds, scheduledAt, variableValues } = parsed.data;

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

  // Scheduling is now purely DB-driven: the cron sender
  // (/api/cron/process-campaigns) processes campaigns whose scheduled_at has
  // passed. A missing schedule means "send now" (scheduled_at = now()).
  const scheduledTime = scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString();

  // Insert campaign
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      business_id: business.id,
      template_id: templateId,
      name,
      status: "scheduled",
      scheduled_at: scheduledTime,
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

  return NextResponse.json({ campaign });
}
