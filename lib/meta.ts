import { decrypt } from "./encrypt";

// FIX (C10): escape RegExp metacharacters so user-supplied strings can be used
// safely inside a dynamically-built pattern.
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// FIX #7: Number of total attempts (1 initial + retries) for transient failures.
const MAX_ATTEMPTS = 3;

// Small helper to pause between retries.
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendWhatsAppMessage(
  accessToken: string,
  phoneNumberId: string,
  to: string,
  templateName: string,
  languageCode: string = "en",
  bodyVariables?: Record<string, string>
) {
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

  const body: any = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
    },
  };

  if (bodyVariables && Object.keys(bodyVariables).length > 0) {
    body.template.components = [
      {
        type: "body",
        parameters: Object.entries(bodyVariables).map(([_, value]) => ({
          type: "text",
          text: value,
        })),
      },
    ];
  }

  // FIX #7: Retry on transient failures instead of giving up after one try.
  // A momentary Meta hiccup (HTTP 429 rate-limit or any 5xx server error) used
  // to permanently fail that one message, so a random subset of recipients
  // silently missed the campaign. We now retry up to MAX_ATTEMPTS times with
  // exponential backoff (1s, 3s, ...), honoring Meta's Retry-After header when
  // present. Non-transient errors (e.g. 4xx like an invalid number or template)
  // are returned immediately — retrying those would never help.
  let lastData: any = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    lastData = data;

    // Success — return right away.
    if (res.ok) {
      return { ok: true, data };
    }

    const isTransient = res.status === 429 || res.status >= 500;
    const isLastAttempt = attempt === MAX_ATTEMPTS;

    // Permanent error, or we've exhausted our attempts — stop and report.
    if (!isTransient || isLastAttempt) {
      return { ok: false, data };
    }

    // Transient error with attempts remaining — wait, then retry.
    // Prefer the server-provided Retry-After (seconds); otherwise back off
    // exponentially: 1s after attempt 1, 3s after attempt 2, ...
    // FIX (H16): `Number(retryAfterHeader)` is NaN for a non-numeric header
    // (Meta can send an HTTP-date). sleep(NaN) resolves immediately, causing a
    // rapid-fire retry storm. Only use the header when it parses to a finite
    // positive number; otherwise fall back to exponential backoff.
    const retryAfterHeader = res.headers.get("retry-after");
    const retryAfterSec = retryAfterHeader ? Number(retryAfterHeader) : NaN;
    const backoffMs =
      Number.isFinite(retryAfterSec) && retryAfterSec > 0
        ? retryAfterSec * 1000
        : Math.pow(3, attempt - 1) * 1000;

    console.warn(
      `[meta] send to ${to} failed (HTTP ${res.status}), attempt ${attempt}/${MAX_ATTEMPTS}. Retrying in ${backoffMs}ms.`
    );
    await sleep(backoffMs);
  }

  // Should be unreachable, but return the last response defensively.
  return { ok: false, data: lastData };
}

/**
 * FEATURE (Chats reply): Send a FREE-FORM text message (not a template).
 *
 * WhatsApp only permits free-form messages inside the 24-hour customer service
 * window — i.e. within 24h of the contact's last inbound message. Outside that
 * window Meta rejects with error 131047 ("re-engagement message") and a template
 * must be used instead. We surface Meta's error verbatim so the UI can explain.
 */
export async function sendWhatsAppText(
  accessToken: string,
  phoneNumberId: string,
  to: string,
  text: string
) {
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  // Meta wants digits only (no leading "+", spaces, or dashes).
  const recipient = to.replace(/[^0-9]/g, "");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "text",
      text: { body: text },
    }),
  });

  const data = await res.json();
  return { ok: res.ok, data };
}

// ───────────────────────────────────────────────────────────────────────────
// FEATURE: Meta Template Management
//
// WhatsApp template messages can only send templates that are registered AND
// approved on Meta. The helpers below submit a locally-authored template to
// Meta for approval. The message body the user wrote is what gets submitted —
// so once Meta approves it, campaigns finally send the user's actual content
// instead of Meta's built-in sample.
// ───────────────────────────────────────────────────────────────────────────

/**
 * Meta requires template names to be lowercase with underscores only
 * (no spaces or capitals). e.g. "Welcome Message" -> "welcome_message".
 */
export function toMetaTemplateName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_") // non-alphanumerics become underscores
    .replace(/^_+|_+$/g, "")       // trim leading/trailing underscores
    .slice(0, 512) || "template";
}

/**
 * Provide a plausible sample value for a variable name. Meta requires an
 * example for every body placeholder so reviewers can see how it renders.
 */
function exampleForVariable(varName: string): string {
  const v = varName.toLowerCase();
  if (v.includes("name")) return "Alex";
  if (v.includes("business") || v.includes("company")) return "Acme Co";
  if (v.includes("discount") || v.includes("percent")) return "20%";
  if (v.includes("code")) return "SAVE20";
  if (v.includes("link") || v.includes("url")) return "https://example.com";
  if (v.includes("date")) return "May 25";
  return "Sample";
}

/**
 * Convert a body written with NAMED variables ({{name}}, {{business}}) into the
 * POSITIONAL format Meta requires ({{1}}, {{2}}). The positional index is taken
 * from the template's declared `variables` array, so it stays consistent with
 * the order the worker sends parameters in at send time.
 *
 * Returns the converted text plus the ordered example values.
 */
export function convertBodyToPositional(
  body: string,
  variables: string[]
): { text: string; examples: string[] } {
  let text = body;
  variables.forEach((varName, i) => {
    // FIX (C10): variable names are user-controlled. Interpolating them straight
    // into a RegExp let a name like "code[" throw a SyntaxError (crash) — or
    // worse, inject regex metacharacters. Escape the name before building the
    // pattern so it's matched literally.
    const re = new RegExp(`\\{\\{\\s*${escapeRegExp(varName)}\\s*\\}\\}`, "g");
    text = text.replace(re, `{{${i + 1}}}`);
  });
  return { text, examples: variables.map(exampleForVariable) };
}

/**
 * Submit a template to Meta for approval.
 * POST https://graph.facebook.com/<v>/{waba_id}/message_templates
 *
 * Returns { ok, data } where data on success contains { id, status, category }.
 * `status` is typically "PENDING" (sometimes "APPROVED" instantly on test WABAs).
 */
export async function createWhatsAppTemplate(params: {
  accessToken: string;
  wabaId: string;
  name: string; // already normalized via toMetaTemplateName
  language?: string;
  body: string;
  variables?: string[];
  category?: "MARKETING" | "UTILITY" | "AUTHENTICATION";
}) {
  const {
    accessToken,
    wabaId,
    name,
    language = "en_US",
    body,
    variables = [],
    category = "MARKETING",
  } = params;

  const { text, examples } = convertBodyToPositional(body, variables);

  // The BODY component. Only attach an `example` when there are variables —
  // Meta rejects an example block for a body with zero placeholders.
  const bodyComponent: any = { type: "BODY", text };
  if (variables.length > 0) {
    bodyComponent.example = { body_text: [examples] };
  }

  const url = `https://graph.facebook.com/v18.0/${wabaId}/message_templates`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      language,
      category,
      components: [bodyComponent],
    }),
  });

  const data = await res.json();
  return { ok: res.ok, data };
}

/**
 * FEATURE (Option A): Fetch all message templates and their current statuses
 * from Meta. This is an OUTBOUND call (your server → Meta), so it works in any
 * environment — including localhost where the inbound approval webhook can't
 * reach you. Used to sync approval status on demand.
 *
 * GET https://graph.facebook.com/<v>/{waba_id}/message_templates
 * Returns { ok, data } where data.data is an array of
 * { name, status, category, language, id, rejected_reason }.
 */
export async function getWhatsAppTemplates(accessToken: string, wabaId: string) {
  const url =
    `https://graph.facebook.com/v18.0/${wabaId}/message_templates` +
    `?fields=name,status,category,language,id,rejected_reason&limit=200`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

/**
 * FEATURE (Delete account): Delete a message template from Meta by name.
 *
 * DELETE https://graph.facebook.com/<v>/{waba_id}/message_templates?name={name}
 * Removes ALL language versions of the named template. Best-effort — used when
 * a user deletes their account so their templates don't linger on the WABA.
 */
export async function deleteWhatsAppTemplate(
  accessToken: string,
  wabaId: string,
  name: string
) {
  const url =
    `https://graph.facebook.com/v18.0/${wabaId}/message_templates` +
    `?name=${encodeURIComponent(name)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // FIX (H15): a DELETE can return 204 No Content (empty body). Calling
  // res.json() on an empty body throws a SyntaxError. Read as text first and
  // parse only if there's something to parse.
  const data = await safeJson(res);
  return { ok: res.ok, data };
}

/** Parse a fetch Response as JSON, tolerating empty (e.g. 204) bodies. */
async function safeJson(res: Response): Promise<any> {
  const raw = await res.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}
