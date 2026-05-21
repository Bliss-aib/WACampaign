import { Worker } from "bullmq";
import { redis } from "../lib/redis";
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
      .select("*, businesses(*), templates(name, body, language, variables)")
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

    for (const cc of contacts) {
      const contact = cc.contacts;
      if (!contact) continue;

      // Check daily limit
      const today = new Date().toISOString().split("T")[0];
      const { data: usage } = await supabase
        .from("daily_usage")
        .select("count")
        .eq("business_id", business.id)
        .eq("date", today)
        .single();

      const used = usage?.count || 0;
      if (used >= dailyLimit) {
        await supabase
          .from("campaign_contacts")
          .update({ status: "failed", error_message: "Daily limit reached" })
          .eq("id", cc.id);
        continue;
      }

      // FIX (campaign send): Build template parameters from the variables the
      // template ACTUALLY declares — not a blanket { name }. The old code always
      // sent a "name" parameter, so a template with zero variables (like the
      // sample "hello_world") was rejected with:
      //   (#132000) Number of parameters does not match the expected number of params
      // We iterate the template's declared variables (stored on the template row)
      // in order, filling "name" from the contact and leaving others blank for now
      // (future: source these from contact custom fields). If the template has no
      // variables, we send none — which matches Meta's expectation.
      const declaredVars: string[] = Array.isArray(campaign.templates?.variables)
        ? (campaign.templates!.variables as string[])
        : [];
      const variables: Record<string, string> = {};
      for (const v of declaredVars) {
        variables[v] = v === "name" ? contact.name || "" : "";
      }

      // FIX #1: Meta identifies templates by their NAME, not by our internal DB id.
      // Previously this passed `campaign.template_id` (a UUID), which made Meta reply
      // "template not found" and every send failed. The template name is already
      // loaded via the `templates(name, body)` join in the query above (line ~15),
      // so we read it from there. Guard against a missing relation just in case.
      const templateName = campaign.templates?.name;
      if (!templateName) {
        await supabase
          .from("campaign_contacts")
          .update({ status: "failed", error_message: "Template name missing" })
          .eq("id", cc.id);
        continue;
      }

      // FIX (campaign send): use the template's stored language code. Meta needs
      // the exact translation (e.g. "en_US"); a wrong code yields error #132001.
      const templateLanguage = campaign.templates?.language || "en_US";

      // Send message
      const { ok, data } = await sendWhatsAppMessage(
        accessToken,
        phoneNumberId,
        contact.phone_number,
        templateName, // FIX #1: pass the Meta template name (was campaign.template_id)
        templateLanguage, // FIX: was hard-coded "en"
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

        // Increment daily usage
        await supabase.from("daily_usage").upsert(
          {
            business_id: business.id,
            date: today,
            count: used + 1,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "business_id,date" }
        );
      } else {
        await supabase
          .from("campaign_contacts")
          .update({
            status: "failed",
            error_message: data.error?.message || "Unknown error",
          })
          .eq("id", cc.id);
      }
    }

    // Update campaign aggregates and status
    const { data: finalCounts } = await supabase
      .from("campaign_contacts")
      .select("status")
      .eq("campaign_id", campaignId);

    if (finalCounts) {
      const sent = finalCounts.filter((c: any) => ["sent", "delivered", "read"].includes(c.status)).length;
      const delivered = finalCounts.filter((c: any) => ["delivered", "read"].includes(c.status)).length;
      const read = finalCounts.filter((c: any) => c.status === "read").length;
      const failed = finalCounts.filter((c: any) => c.status === "failed").length;

      await supabase
        .from("campaigns")
        .update({
          status: "completed",
          sent_count: sent,
          delivered_count: delivered,
          read_count: read,
          failed_count: failed,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId);
    }
  },
  { connection: redis, concurrency: 1 }
);

worker.on("completed", (job) => {
  console.log(`Campaign ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Campaign ${job?.id} failed:`, err);
});

console.log("Campaign worker started");
