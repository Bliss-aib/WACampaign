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

// ─── Import: positional -> named variable inference ─────────────────────────
//
// Meta stores body placeholders POSITIONALLY ({{1}}, {{2}}, ...) and keeps only
// the example values — never the original variable names. But our own
// createWhatsAppTemplate (see lib/meta exampleForVariable) generates predictable
// example values per name, so we can reverse them back to names on import.

// Exact reverse of exampleForVariable()'s outputs.
const EXAMPLE_TO_NAME: Record<string, string> = {
  Alex: "name",
  "Acme Co": "business",
  "20%": "discount",
  SAVE20: "code",
  "https://example.com": "link",
  "May 25": "date",
};

/**
 * Infer a friendly variable name for positional placeholder `index` (1-based)
 * from its example value. Falls back to heuristics, then to "varN".
 */
function inferVariableName(example: unknown, index: number): string {
  const raw = typeof example === "string" ? example.trim() : "";
  if (!raw) return `var${index}`;

  // 1. Exact match against the examples our own submitter produces.
  if (EXAMPLE_TO_NAME[raw]) return EXAMPLE_TO_NAME[raw];

  // 2. Heuristics for templates created outside this app.
  if (/^https?:\/\//i.test(raw)) return "link";
  if (/%$/.test(raw)) return "discount";
  if (/^\$?\d+(\.\d+)?$/.test(raw)) return "price";
  if (/^[A-Z0-9]{4,}$/.test(raw)) return "code";
  if (
    /\d{4}-\d{2}-\d{2}/.test(raw) ||
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(raw)
  )
    return "date";

  return `var${index}`;
}

/**
 * Convert a Meta BODY component (positional placeholders + example values) into
 * a body with NAMED placeholders and the matching ordered variable list.
 */
function namedBodyFromComponent(bodyText: string, examples: unknown[]): { body: string; variables: string[] } {
  // Highest placeholder index present in the text.
  const indices = Array.from(bodyText.matchAll(/\{\{\s*(\d+)\s*\}\}/g)).map((x: any) =>
    parseInt(x[1], 10)
  );
  const maxIdx = indices.length ? Math.max(...indices) : 0;
  if (maxIdx === 0) return { body: bodyText, variables: [] };

  const used = new Set<string>();
  const variables: string[] = [];
  let body = bodyText;

  for (let i = 1; i <= maxIdx; i++) {
    let name = inferVariableName(examples[i - 1], i);
    // De-duplicate collisions (e.g. two URL variables both -> "link").
    if (used.has(name)) {
      let suffix = 2;
      while (used.has(`${name}${suffix}`)) suffix++;
      name = `${name}${suffix}`;
    }
    used.add(name);
    variables.push(name);

    // Replace every {{i}} (allowing inner spaces) with {{name}}.
    const re = new RegExp(`\\{\\{\\s*${i}\\s*\\}\\}`, "g");
    body = body.replace(re, `{{${name}}}`);
  }

  return { body, variables };
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
 * Placeholders are relabelled from positional ({{1}}) back to named variables
 * by inferring names from the example values Meta stores (see inferVariableName).
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

    // Reconstruct the body from the BODY component, relabelling placeholders.
    const bodyComp = (m.components || []).find(
      (c: any) => String(c.type).toUpperCase() === "BODY"
    );
    const rawBody = bodyComp?.text || "";
    const examples: unknown[] = bodyComp?.example?.body_text?.[0] || [];
    const { body, variables } = namedBodyFromComponent(rawBody, examples);

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

/**
 * FEATURE (Template sync): full two-way reconcile against the connected WABA.
 *
 * Templates live on the WhatsApp Business Account (waba_id) — NOT the phone
 * number and NOT the Meta app. So when a business switches WABA (e.g. moves to a
 * test number), its old templates no longer exist on the new WABA and Meta
 * rejects sends with "(#132001) Template name does not exist in the
 * translation". The existing helpers each cover only half the problem:
 *   • importTemplatesFromMeta adds WABA templates missing locally, and
 *   • refreshTemplateStatuses updates statuses but SKIPS rows not found on Meta.
 * Neither demotes a local "approved" template that is absent from the current
 * WABA — so the campaign UI keeps offering phantoms that always fail.
 *
 * This single call fetches the live list once and reconciles in three ways:
 *   1. ADD     — insert Meta templates we don't have locally.
 *   2. UPDATE  — sync the status of locals that exist on this WABA.
 *   3. DEMOTE  — any local template absent from this WABA that was Meta-managed
 *                or still marked "approved" is reset to "local" (and unlinked),
 *                removing it from campaign selection until re-submitted here.
 *
 * Outbound-only (server -> Meta), so it works on localhost too.
 */
export async function syncTemplatesFromMeta(businessId: string) {
  const { data: business } = await supabase
    .from("businesses")
    .select("waba_id, access_token, connection_status")
    .eq("id", businessId)
    .single();

  if (!business || business.connection_status !== "connected" || !business.waba_id || !business.access_token) {
    return { ok: false, error: "WhatsApp is not connected. Connect it in Settings first." };
  }

  const token = decrypt(business.access_token);

  // One fetch, WITH components (so we can reconstruct bodies for added rows).
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

  // Index Meta templates by name (first language row wins for lookup).
  const metaByName: Record<string, any> = {};
  for (const m of metaTemplates) {
    if (m?.name && !metaByName[m.name]) metaByName[m.name] = m;
  }

  // Snapshot of local rows BEFORE we add anything.
  const { data: locals } = await supabase
    .from("templates")
    .select("id, name, meta_template_name, status")
    .eq("business_id", businessId);

  const localNames = new Set<string>();
  for (const l of locals || []) {
    if (l.name) localNames.add(String(l.name));
    if (l.meta_template_name) localNames.add(String(l.meta_template_name));
  }

  let added = 0;
  let updated = 0;
  let demoted = 0;

  // 1) ADD — Meta templates with no local row.
  const rows: any[] = [];
  for (const m of metaTemplates) {
    const metaName: string = m.name;
    if (!metaName || localNames.has(metaName)) continue;
    localNames.add(metaName); // guard duplicate language rows within this loop

    const bodyComp = (m.components || []).find(
      (c: any) => String(c.type).toUpperCase() === "BODY"
    );
    const rawBody = bodyComp?.text || "";
    const examples: unknown[] = bodyComp?.example?.body_text?.[0] || [];
    const { body, variables } = namedBodyFromComponent(rawBody, examples);

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
  if (rows.length) {
    const { data: ins, error } = await supabase.from("templates").insert(rows).select("id");
    if (error) return { ok: false, error: error.message };
    added = ins?.length || 0;
  }

  // 2) UPDATE statuses for locals present on this WABA; 3) DEMOTE phantoms.
  for (const local of locals || []) {
    const lookupName = (local.meta_template_name as string) || (local.name as string);
    const meta = lookupName ? metaByName[lookupName] : undefined;

    if (meta) {
      const newStatus = META_STATUS_MAP[String(meta.status).toUpperCase()] || local.status;
      const patch: any = {
        rejection_reason:
          newStatus === "rejected"
            ? meta.rejected_reason && meta.rejected_reason !== "NONE"
              ? meta.rejected_reason
              : "Rejected by Meta"
            : null,
      };
      if (newStatus !== local.status) patch.status = newStatus;
      if (meta.id) patch.meta_template_id = String(meta.id);
      if (!local.meta_template_name) patch.meta_template_name = lookupName;

      await supabase.from("templates").update(patch).eq("id", local.id);
      if (patch.status) updated++;
    } else {
      // Absent from this WABA. Only demote rows that were Meta-managed or are
      // still "approved" — leave genuinely-local/pending drafts untouched.
      const wasMetaManaged = !!local.meta_template_name;
      if (wasMetaManaged || local.status === "approved") {
        await supabase
          .from("templates")
          .update({
            status: "local",
            meta_template_id: null,
            meta_template_name: null,
            rejection_reason:
              "Not on the connected WhatsApp account (different WABA). Re-submit to use it here.",
          })
          .eq("id", local.id);
        demoted++;
      }
    }
  }

  return { ok: true, added, updated, demoted };
}
