// FEATURE: Meta Template Management — shared submission logic.
//
// Used by BOTH the create route (auto-submit on creation) and the manual
// "Submit to Meta" endpoint, so the behaviour stays identical. Loads the
// business's WhatsApp credentials, decrypts the access token, submits the
// template to Meta, and records the resulting status on the template row.

import { supabase } from "./db/client";
import { decrypt } from "./encrypt";
import { createWhatsAppTemplate, getWhatsAppTemplates, toMetaTemplateName } from "./meta";

// Maps Meta's UPPERCASE status values to our local lowercase lifecycle values.
const META_STATUS_MAP: Record<string, string> = {
  APPROVED: "approved",
  PENDING: "pending",
  REJECTED: "rejected",
  PAUSED: "paused",
  DISABLED: "disabled",
};

export async function submitTemplate(templateId: string, businessId: string) {
  // 1. Business must be connected and have WABA credentials.
  const { data: business } = await supabase
    .from("businesses")
    .select("waba_id, access_token, connection_status")
    .eq("id", businessId)
    .single();

  if (!business || business.connection_status !== "connected" || !business.waba_id || !business.access_token) {
    return { ok: false, error: "WhatsApp is not connected. Connect it in Settings before submitting templates." };
  }

  // 2. Load the template to submit.
  const { data: template } = await supabase
    .from("templates")
    .select("name, body, language, variables")
    .eq("id", templateId)
    .eq("business_id", businessId)
    .single();

  if (!template) return { ok: false, error: "Template not found." };

  // 3. Submit to Meta.
  const metaName = toMetaTemplateName(template.name);
  const token = decrypt(business.access_token);
  const variables = Array.isArray(template.variables) ? (template.variables as string[]) : [];

  const res = await createWhatsAppTemplate({
    accessToken: token,
    wabaId: business.waba_id,
    name: metaName,
    language: template.language || "en_US",
    body: template.body,
    variables,
  });

  // 4. Record the outcome on the template row.
  if (res.ok) {
    // Meta returns status PENDING (or sometimes APPROVED instantly on test WABAs).
    const metaStatus = String(res.data?.status || "PENDING").toLowerCase();
    const status = metaStatus === "approved" ? "approved" : "pending";
    await supabase
      .from("templates")
      .update({
        status,
        meta_template_id: res.data?.id || null,
        meta_template_name: metaName,
        submitted_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq("id", templateId);
    return { ok: true, status };
  }

  // Submission rejected by Meta — surface the reason and mark rejected.
  const reason =
    res.data?.error?.error_user_msg ||
    res.data?.error?.message ||
    "Meta rejected the template submission.";
  await supabase
    .from("templates")
    .update({ status: "rejected", rejection_reason: reason })
    .eq("id", templateId);
  return { ok: false, error: reason };
}

/**
 * FEATURE (Option A): On-demand sync of template approval statuses from Meta.
 *
 * Fetches the business's templates from Meta and updates the local status of any
 * template we previously submitted (i.e. has a meta_template_name). This is the
 * outbound-only alternative to the inbound approval webhook, so it works on
 * localhost. Returns the number of templates whose status changed.
 */
export async function refreshTemplateStatuses(businessId: string) {
  const { data: business } = await supabase
    .from("businesses")
    .select("waba_id, access_token, connection_status")
    .eq("id", businessId)
    .single();

  if (!business || business.connection_status !== "connected" || !business.waba_id || !business.access_token) {
    return { ok: false, error: "WhatsApp is not connected. Connect it in Settings first." };
  }

  const token = decrypt(business.access_token);
  const res = await getWhatsAppTemplates(token, business.waba_id);
  if (!res.ok) {
    return { ok: false, error: res.data?.error?.message || "Failed to fetch templates from Meta." };
  }

  // Index Meta's templates by name for quick lookup.
  const metaByName: Record<string, any> = {};
  for (const t of res.data?.data || []) metaByName[t.name] = t;

  // Only sync templates we actually submitted (those have a meta_template_name).
  const { data: locals } = await supabase
    .from("templates")
    .select("id, meta_template_name, status")
    .eq("business_id", businessId)
    .not("meta_template_name", "is", null);

  let updated = 0;
  for (const local of locals || []) {
    const meta = metaByName[local.meta_template_name as string];
    if (!meta) continue; // not found on Meta's side — leave as-is

    const newStatus = META_STATUS_MAP[String(meta.status).toUpperCase()] || local.status;
    if (newStatus === local.status) continue; // no change

    const update: any = { status: newStatus };
    update.rejection_reason =
      newStatus === "rejected"
        ? meta.rejected_reason && meta.rejected_reason !== "NONE"
          ? meta.rejected_reason
          : "Rejected by Meta"
        : null;

    await supabase.from("templates").update(update).eq("id", local.id);
    updated++;
  }

  return { ok: true, updated };
}
