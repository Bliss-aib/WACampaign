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
      .select("*, businesses(*), templates(name, body)")
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

      // Build variables from contact
      const variables: Record<string, string> = { name: contact.name };

      // Send message
      const { ok, data } = await sendWhatsAppMessage(
        accessToken,
        phoneNumberId,
        contact.phone_number,
        campaign.template_id, // Note: Meta template name must match. In real app, store meta template name separately.
        "en",
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
