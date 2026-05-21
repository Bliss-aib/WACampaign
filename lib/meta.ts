import { decrypt } from "./encrypt";

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
    const retryAfterHeader = res.headers.get("retry-after");
    const backoffMs = retryAfterHeader
      ? Number(retryAfterHeader) * 1000
      : Math.pow(3, attempt - 1) * 1000;

    console.warn(
      `[meta] send to ${to} failed (HTTP ${res.status}), attempt ${attempt}/${MAX_ATTEMPTS}. Retrying in ${backoffMs}ms.`
    );
    await sleep(backoffMs);
  }

  // Should be unreachable, but return the last response defensively.
  return { ok: false, data: lastData };
}
