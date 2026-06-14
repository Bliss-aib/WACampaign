import { supabase } from "./db/client";
import { decrypt } from "./encrypt";
import { sendWhatsAppMessage } from "./meta";

export type SendResult = {
  campaignId: string;
  processed: number;
  status: "sending" | "completed" | "paused" | "skipped" | "error";
  reason?: string;
};

/**
 * Send one campaign's pending contacts in a BOUNDED batch.
 *
 * Designed to be called repeatedly (every minute by the Supabase cron) until the
 * campaign drains, so a single serverless invocation never exceeds the function
 * time limit.
 *
 * - Claims each contact atomically (pending -> sending) so concurrent cron runs
 *   or retries can't send to the same person twice.
 * - Reserves a daily-send slot atomically (claim_daily_send) — pauses the
 *   campaign (resumable) when the business hits its daily limit.
 * - Leaves the campaign 'sending' while pending contacts remain (the next tick
 *   continues), marks 'completed' when drained, 'paused' on daily limit.
 */
export async function sendCampaign(campaignId: string, maxPerRun = 25): Promise<SendResult> {
  const { data: campaign } = await supabase
    .from("campaigns")
    .select(
      "*, businesses(*), templates(name, meta_template_name, status, body, language, variables)"
    )
    .eq("id", campaignId)
    .single();

  if (!campaign) return { campaignId, processed: 0, status: "skipped", reason: "not found" };

  const business = campaign.businesses;
  if (!business || business.connection_status !== "connected") {
    return { campaignId, processed: 0, status: "skipped", reason: "business not connected" };
  }

  const tpl = campaign.templates;
  const declaredVars: string[] = Array.isArray(tpl?.variables) ? (tpl!.variables as string[]) : [];
  const campaignVars: Record<string, string> = campaign.variable_values || {};
  const templateName = tpl?.meta_template_name || tpl?.name;
  const templateLanguage = tpl?.language || "en_US";

  // Mark as sending (idempotent).
  await supabase.from("campaigns").update({ status: "sending" }).eq("id", campaignId);

  // Approval guard — fail the whole pending batch fast.
  if (tpl?.status !== "approved" || !templateName) {
    const reason = !templateName
      ? "Template name missing"
      : `Template is not approved by Meta (status: ${tpl?.status || "unknown"})`;
    await supabase
      .from("campaign_contacts")
      .update({ status: "failed", error_message: reason })
      .eq("campaign_id", campaignId)
      .eq("status", "pending");
    await supabase.rpc("recalc_campaign_counts", { p_campaign_id: campaignId });
    await supabase
      .from("campaigns")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", campaignId);
    return { campaignId, processed: 0, status: "completed", reason };
  }

  const accessToken = decrypt(business.access_token);
  const phoneNumberId = business.phone_number_id;
  const dailyLimit = business.daily_limit;
  const today = new Date().toISOString().split("T")[0];

  // Pull a bounded batch of pending contacts.
  const { data: contacts } = await supabase
    .from("campaign_contacts")
    .select("*, contacts(name, phone_number)")
    .eq("campaign_id", campaignId)
    .eq("status", "pending")
    .limit(maxPerRun);

  let processed = 0;
  let pausedForLimit = false;

  for (const cc of contacts || []) {
    const contact = cc.contacts;
    if (!contact) continue;

    // Claim (pending -> sending) so a concurrent run can't double-send.
    const { data: claimed } = await supabase
      .from("campaign_contacts")
      .update({ status: "sending" })
      .eq("id", cc.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    // Reserve a daily-send slot atomically.
    const { data: allowed, error: claimErr } = await supabase.rpc("claim_daily_send", {
      p_business_id: business.id,
      p_date: today,
      p_limit: dailyLimit,
    });
    if (claimErr || !allowed) {
      await supabase.from("campaign_contacts").update({ status: "pending" }).eq("id", cc.id);
      pausedForLimit = true;
      break;
    }

    const variables: Record<string, string> = {};
    for (const v of declaredVars) {
      variables[v] = v === "name" ? contact.name || "" : campaignVars[v] || "";
    }

    try {
      const { ok, data } = await sendWhatsAppMessage(
        accessToken,
        phoneNumberId,
        contact.phone_number,
        templateName,
        templateLanguage,
        variables
      );
      if (ok && data.messages?.[0]?.id) {
        await supabase
          .from("campaign_contacts")
          .update({
            status: "sent",
            meta_message_id: data.messages[0].id,
            sent_at: new Date().toISOString(),
          })
          .eq("id", cc.id);
      } else {
        await supabase
          .from("campaign_contacts")
          .update({ status: "failed", error_message: data?.error?.message || "Unknown error" })
          .eq("id", cc.id);
      }
    } catch (err: any) {
      await supabase
        .from("campaign_contacts")
        .update({ status: "failed", error_message: err?.message || "Send threw an exception" })
        .eq("id", cc.id);
    }
    processed++;
  }

  // Recompute aggregates atomically (no read-then-write race).
  await supabase.rpc("recalc_campaign_counts", { p_campaign_id: campaignId });

  if (pausedForLimit) {
    await supabase
      .from("campaigns")
      .update({ status: "paused", updated_at: new Date().toISOString() })
      .eq("id", campaignId);
    return { campaignId, processed, status: "paused" };
  }

  // Any pending left? Keep 'sending' so the next cron tick continues.
  const { count: pendingRemain } = await supabase
    .from("campaign_contacts")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "pending");

  if ((pendingRemain || 0) > 0) {
    return { campaignId, processed, status: "sending" };
  }

  await supabase
    .from("campaigns")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", campaignId);
  return { campaignId, processed, status: "completed" };
}
