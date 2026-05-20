import { decrypt } from "./encrypt";

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

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return { ok: res.ok, data };
}
