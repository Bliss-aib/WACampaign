import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN!;
const APP_SECRET = process.env.META_APP_SECRET!;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // TODO: Verify X-Hub-Signature-256 with APP_SECRET
    // const signature = req.headers.get("x-hub-signature-256");

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field === "messages") {
          const value = change.value;

          // ── Handle message statuses (sent, delivered, read, failed) ──
          const statuses = value?.statuses || [];
          for (const status of statuses) {
            const messageId = status.id;
            const messageStatus = status.status;

            if (!messageId) continue;

            const { data: campaignContact } = await supabase
              .from("campaign_contacts")
              .select("id, campaign_id")
              .eq("meta_message_id", messageId)
              .single();

            if (!campaignContact) continue;

            const update: any = { status: messageStatus };
            if (messageStatus === "sent") update.sent_at = new Date().toISOString();
            if (messageStatus === "delivered") update.delivered_at = new Date().toISOString();
            if (messageStatus === "read") update.read_at = new Date().toISOString();
            if (messageStatus === "failed") update.error_message = status.errors?.[0]?.title || "Failed";

            await supabase
              .from("campaign_contacts")
              .update(update)
              .eq("id", campaignContact.id);

            // Update campaign aggregate counts
            const { data: counts } = await supabase
              .from("campaign_contacts")
              .select("status")
              .eq("campaign_id", campaignContact.campaign_id);

            if (counts) {
              const sent = counts.filter((c: any) => ["sent", "delivered", "read"].includes(c.status)).length;
              const delivered = counts.filter((c: any) => ["delivered", "read"].includes(c.status)).length;
              const read = counts.filter((c: any) => c.status === "read").length;
              const failed = counts.filter((c: any) => c.status === "failed").length;

              await supabase
                .from("campaigns")
                .update({ sent_count: sent, delivered_count: delivered, read_count: read, failed_count: failed })
                .eq("id", campaignContact.campaign_id);
            }
          }

          // ── Handle INCOMING messages from contacts ──
          // NOTE: Requires "messages" table: id, business_id, contact_phone, contact_name, text, sender, created_at
          const messages = value?.messages || [];
          const metadata = value?.metadata;
          const businessPhoneId = metadata?.phone_number_id;

          for (const msg of messages) {
            if (msg.type !== "text" || !msg.text?.body) continue;

            const from = msg.from;
            const text = msg.text.body;

            // Find business by phone_number_id
            const { data: business } = await supabase
              .from("businesses")
              .select("id")
              .eq("phone_number_id", businessPhoneId)
              .single();

            if (!business) continue;

            // Try to find contact name
            const { data: contact } = await supabase
              .from("contacts")
              .select("name")
              .eq("business_id", business.id)
              .eq("phone_number", from)
              .single();

            const contactName = contact?.name || from;

            // Store incoming message (best-effort — table may not exist yet)
            try {
              await supabase.from("messages").insert({
                business_id: business.id,
                contact_phone: from,
                contact_name: contactName,
                text,
                sender: "them",
                created_at: new Date().toISOString(),
              });
            } catch {
              // messages table doesn't exist yet — log and skip
              console.log("Incoming message from", from, ":", text);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Meta webhook error:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
