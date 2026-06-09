import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "@/lib/db/client";

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN!;
const APP_SECRET = process.env.META_APP_SECRET!;

/**
 * FIX #6: Verify that an incoming webhook POST genuinely came from Meta.
 *
 * Meta signs every webhook body with an HMAC-SHA256 using the app's App Secret
 * and sends it in the `x-hub-signature-256` header as "sha256=<hex>". We
 * recompute that signature over the EXACT raw request body and compare using a
 * timing-safe comparison (to avoid timing attacks).
 *
 * Returns false when the signature is missing or doesn't match.
 * If APP_SECRET is not configured (e.g. local dev), we skip verification and
 * log a warning so the local environment keeps working — production must set it.
 */
function isValidMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!APP_SECRET) {
    // FIX (C6): never skip verification in production. If the secret is missing
    // there (a misconfiguration), REJECT the request — otherwise anyone could
    // forge webhooks. Only allow the skip in non-production for local testing.
    if (process.env.NODE_ENV === "production") {
      console.error("[meta webhook] META_APP_SECRET is not set in production — rejecting request.");
      return false;
    }
    console.warn("[meta webhook] META_APP_SECRET not set — skipping signature verification (dev only).");
    return true;
  }
  if (!signatureHeader) return false;

  const expected =
    "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(rawBody, "utf8").digest("hex");

  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  // timingSafeEqual throws if the buffers differ in length, so guard first.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

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
    // FIX #6: Read the RAW body first. We must verify the signature against the
    // exact bytes Meta sent — calling req.json() directly would re-serialize and
    // break the HMAC comparison. We parse manually after verification passes.
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    if (!isValidMetaSignature(rawBody, signature)) {
      console.warn("[meta webhook] Rejected request with invalid signature.");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        // FEATURE: Meta Template Management — sync approval results.
        // When Meta finishes reviewing a template it sends a
        // "message_template_status_update" event. We flip our local template's
        // status to match (approved / rejected / paused / disabled) and store
        // the rejection reason so the dashboard can show it.
        if (change.field === "message_template_status_update") {
          const v = change.value || {};
          const metaTemplateId = v.message_template_id ? String(v.message_template_id) : null;
          const metaTemplateName = v.message_template_name || null;
          const event = String(v.event || "").toUpperCase(); // APPROVED | REJECTED | PAUSED | DISABLED | ...

          const statusMap: Record<string, string> = {
            APPROVED: "approved",
            REJECTED: "rejected",
            PAUSED: "paused",
            DISABLED: "disabled",
          };
          const newStatus = statusMap[event];
          if (newStatus) {
            const update: any = { status: newStatus };
            // Meta sends the reason under different keys depending on event.
            update.rejection_reason =
              newStatus === "rejected" ? v.reason || v.rejected_reason || "Rejected by Meta" : null;

            // FIX (C4): scope the update to the business that owns this WABA.
            // Previously the update matched only by meta_template_id, or fell back
            // to meta_template_name — and template names are NOT globally unique,
            // so a name-only match could flip the status of every business's
            // template with that name. entry.id is the WABA id for these events.
            const wabaId = entry.id ? String(entry.id) : null;
            const { data: ownerBiz } = wabaId
              ? await supabase.from("businesses").select("id").eq("waba_id", wabaId).single()
              : { data: null };

            if (ownerBiz?.id) {
              // Resolved the owner — scope to it, then match by id (preferred) or name.
              let q = supabase.from("templates").update(update).eq("business_id", ownerBiz.id);
              q = metaTemplateId
                ? q.eq("meta_template_id", metaTemplateId)
                : q.eq("meta_template_name", metaTemplateName);
              const { error: tplErr } = await q;
              if (tplErr) console.error("Failed to sync template status:", tplErr.message);
            } else if (metaTemplateId) {
              // Can't resolve the business, but meta_template_id IS globally unique,
              // so matching on it alone is safe.
              const { error: tplErr } = await supabase
                .from("templates")
                .update(update)
                .eq("meta_template_id", metaTemplateId);
              if (tplErr) console.error("Failed to sync template status:", tplErr.message);
            } else {
              // No business and only a non-unique name → refuse, to avoid
              // clobbering other tenants' templates.
              console.warn(
                "[meta webhook] template status update skipped: unresolved business and no meta_template_id."
              );
            }
          }
          continue; // handled this change
        }

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

            // FIX (C7): recompute the campaign's aggregate counts atomically in the
            // DB. The old code read every campaign_contact row, counted in JS, then
            // wrote the totals back — so two webhook deliveries arriving at once
            // would both read the old state and the second write would clobber the
            // first (lost update), permanently corrupting the counts.
            await supabase.rpc("recalc_campaign_counts", {
              p_campaign_id: campaignContact.campaign_id,
            });
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

            // FIX #5: Persist the incoming customer reply. The `messages` table
            // is now created by migration 003_messages.sql. Supabase returns
            // errors in the result object (it does not throw), so we check
            // `error` explicitly and log it rather than silently dropping the
            // message as the previous try/catch did.
            const { error: insertError } = await supabase.from("messages").insert({
              business_id: business.id,
              contact_phone: from,
              contact_name: contactName,
              text,
              sender: "them",
              created_at: new Date().toISOString(),
            });
            if (insertError) {
              console.error("Failed to store incoming message from", from, ":", insertError.message);
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
