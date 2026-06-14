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

/**
 * FEATURE (Import from Meta): recover templates that exist on the Meta WABA but
 * are missing from the local DB.
 *
 * Scenario: a user deletes their account (which wipes their local template rows)
 * and later signs back in. The templates still live on the Meta WABA, so trying
 * to re-create them fails with "There is already English (US) content for this
 * template." This pulls every template from Meta and inserts any whose
 * meta_template_name we don't already have locally, reconstructing the body and
 * variables from the BODY component.
 *
 * Note: Meta stores body placeholders POSITIONALLY ({{1}}, {{2}}, ...) and does
 * not keep the original variable names, so imported templates use positional
 * variables. They remain fully sendable; only the variable labels differ.
 */
export async function importTemplatesFromMeta(businessId: string) {
  const { data: business } = await supabase
    .from("businesses")
    .select("waba_id, access_token, connection_status")
    .eq("id", businessId)
    .single();

  if (!business || business.connection_status !== "connected" || !business.waba_id || !business.access_token) {
    return { ok: false, error: "WhatsApp is not connected. Connect it in Settings first." };
  }

  const token = decrypt(business.access_token);

  // Fetch templates WITH their components so we can reconstruct the body. (The
  // shared getWhatsAppTemplates omits components, so we request them here.)
  const graphVersion = process.env.META_GRAPH_VERSION || "v18.0";
  const url =
    `https://graph.facebook.com/${graphVersion}/${business.waba_id}/message_templates` +
    `?fields=name,status,category,language,id,rejected_reason,components&limit=200`;

  let metaTemplates: any[] = [];
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data?.error?.message || "Failed to fetch templates from Meta." };
    }
    metaTemplates = Array.isArray(data?.data) ? data.data : [];
  } catch (e: any) {
    return { ok: false, error: e?.message || "Could not reach Meta." };
  }

  // Names we already have locally — skip those.
  const { data: locals } = await supabase
    .from("templates")
    .select("meta_template_name, name")
    .eq("business_id", businessId);
  const existing = new Set<string>();
  for (const l of locals || []) {
    if (l.meta_template_name) existing.add(String(l.meta_template_name));
    if (l.name) existing.add(String(l.name));
  }

  const rows: any[] = [];
  const seen = new Set<string>(existing);
  for (const m of metaTemplates) {
    const metaName: string = m.name;
    if (!metaName || seen.has(metaName)) continue; // already local or duplicate language row
    seen.add(metaName);

    // Reconstruct the body from the BODY component.
    const bodyComp = (m.components || []).find(
      (c: any) => String(c.type).toUpperCase() === "BODY"
    );
    const body = bodyComp?.text || "";

    // Positional placeholders ({{1}}, {{2}}, ...) -> variable list ["1","2",...].
    const indices = Array.from(body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)).map((x: any) =>
      parseInt(x[1], 10)
    );
    const maxIdx = indices.length ? Math.max(...indices) : 0;
    const variables = Array.from({ length: maxIdx }, (_, i) => String(i + 1));

    const status = META_STATUS_MAP[String(m.status).toUpperCase()] || "approved";
    const rejection =
      status === "rejected"
        ? m.rejected_reason && m.rejected_reason !== "NONE"
          ? m.rejected_reason
          : "Rejected by Meta"
        : null;

    rows.push({
      business_id: businessId,
      name: metaName,
      body,
      variables,
      image_urls: null,
      language: m.language || "en_US",
      status,
      meta_template_id: m.id ? String(m.id) : null,
      meta_template_name: metaName,
      rejection_reason: rejection,
      submitted_at: new Date().toISOString(),
    });
  }

  if (rows.length === 0) {
    return { ok: true, imported: 0 };
  }

  const { data: inserted, error } = await supabase.from("templates").insert(rows).select("id");
  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, imported: inserted?.length || 0 };
}
