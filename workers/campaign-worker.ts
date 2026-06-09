import { Worker } from "bullmq";
import { getRedis } from "../lib/redis";
import { supabase } from "../lib/db/client";
import { decrypt } from "../lib/encrypt";
import { sendWhatsAppMessage } from "../lib/meta";

const worker = new Worker(
  "campaign-queue",
  async (job) => {
    const { campaignId } = job.data;

    // Get campaign + business
    const { data: campaign } = await supabase
      .from("campaigns")
      // FIX (campaign send): also fetch the template's `language` (correct Meta
      // translation code, e.g. "en_US") and `variables` (the parameters the
      // template actually declares) so we send the right number of parameters.
      // FEATURE: also fetch `status` (only 'approved' templates may be sent) and
      // `meta_template_name` (the exact name Meta knows the template by).
      .select("*, businesses(*), templates(name, meta_template_name, status, body, language, variables)")
      .eq("id", campaignId)
      .single();

    if (!campaign) throw new Error("Campaign not found");

    const business = campaign.businesses;
    if (!business || business.connection_status !== "connected") {
      throw new Error("Business not connected");
    }

    const accessToken = decrypt(business.access_token);
    const phoneNumberId = business.phone_number_id;
    const dailyLimit = business.daily_limit;

    // Get pending contacts
    const { data: contacts } = await supabase
      .from("campaign_contacts")
      .select("*, contacts(name, phone_number)")
      .eq("campaign_id", campaignId)
      .eq("status", "pending");

    if (!contacts || contacts.length === 0) return;

    // Update campaign status to sending
    await supabase.from("campaigns").update({ status: "sending" }).eq("id", campaignId);

    // ── Template invariants (same for every contact) — compute once. ──────────
    // FIX (campaign send): parameters are built from the variables the template
    // ACTUALLY declares (filling {{name}} per-contact, other vars from the
    // campaign-level values). Meta identifies templates by NAME + language.
    const tpl = campaign.templates;
    const declaredVars: string[] = Array.isArray(tpl?.variables) ? (tpl!.variables as string[]) : [];
    const campaignVars: Record<string, string> = campaign.variable_values || {};
    const templateName = tpl?.meta_template_name || tpl?.name;
    const templateLanguage = tpl?.language || "en_US";

    // FEATURE: only APPROVED templates may be sent. This doesn't vary per contact,
    // so fail the whole pending batch fast instead of per-row inside the loop.
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
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    let pausedForLimit = false;

    for (const cc of contacts) {
      const contact = cc.contacts;
      if (!contact) continue;

      // FIX (C8): atomically claim this contact (pending -> sending) BEFORE the
      // send. A retried job (e.g. after a crash) or a second worker can't send to
      // the same person twice: the conditional update only succeeds for the first
      // claimant; everyone else gets 0 rows and skips. Contacts left in 'sending'
      // after a crash are intentionally NOT auto-resent (avoids duplicates) and
      // can be reconciled manually.
      const { data: claimed } = await supabase
        .from("campaign_contacts")
        .update({ status: "sending" })
        .eq("id", cc.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (!claimed) continue;

      // FIX (C9 + H12): atomically reserve one daily-send slot. This can never
      // exceed the limit even under concurrency. When the limit is hit we revert
      // this contact to 'pending' and PAUSE the campaign (resumable) instead of
      // marking everything failed + 'completed' as the old code did.
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

      // Build this contact's template parameters.
      const variables: Record<string, string> = {};
      for (const v of declaredVars) {
        variables[v] = v === "name" ? contact.name || "" : campaignVars[v] || "";
      }

      // FIX (H11): wrap the send so a single network throw fails only THIS contact
      // instead of crashing the whole job (which previously restarted from the
      // beginning, re-processing earlier contacts).
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
    }

    // FIX (C7): recompute aggregates atomically in the DB (no read-then-write race).
    await supabase.rpc("recalc_campaign_counts", { p_campaign_id: campaignId });
    // FIX (H12): a daily-limit stop is 'paused' (resumable later); otherwise done.
    await supabase
      .from("campaigns")
      .update({
        status: pausedForLimit ? "paused" : "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);
  },
  { connection: getRedis(), concurrency: 1 }
);

worker.on("completed", (job) => {
  console.log(`Campaign ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Campaign ${job?.id} failed:`, err);
});

console.log("Campaign worker started");
