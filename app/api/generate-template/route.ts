import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
// FIX (C1): this endpoint was the only API route with NO auth gate — anyone on
// the internet could POST and burn our Anthropic/OpenAI credits. Require a
// signed-in user like every other route.
import { getUserId } from "@/lib/auth";

// ─────────────────────────────────────────────────────────────────────────
// AI template generation — provider-configurable (Option B).
//
// One endpoint, three backends, selected by the AI_PROVIDER env var:
//   AI_PROVIDER=anthropic  → Claude via the official @anthropic-ai/sdk
//   AI_PROVIDER=openai     → OpenAI Chat Completions (gpt-4o)
//   AI_PROVIDER=mock       → canned sample templates (no key needed)
//
// If AI_PROVIDER is unset, we AUTO-DETECT: prefer Anthropic if its key is set,
// then OpenAI, otherwise fall back to mock. The frontend is unchanged — it just
// POSTs { prompt, imageBase64 } and receives { result }. This keeps future
// provider swaps to a single env var with no code edits.
// ─────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  "You are a WhatsApp marketing expert. Generate concise, friendly message templates based on the user's prompt and any uploaded image. Use {{variable}} syntax for dynamic values like names, dates, prices, etc. Keep it under 500 characters. Output ONLY the message body, nothing else.";

type Provider = "anthropic" | "openai" | "mock";

function hasKey(name: string): boolean {
  const v = process.env[name];
  return !!v && !v.startsWith("your_");
}

/** Decide which backend to use: explicit AI_PROVIDER, else auto-detect by key. */
function resolveProvider(): Provider {
  const explicit = process.env.AI_PROVIDER?.toLowerCase();
  if (explicit === "anthropic" || explicit === "openai" || explicit === "mock") {
    return explicit;
  }
  if (hasKey("ANTHROPIC_API_KEY")) return "anthropic";
  if (hasKey("OPENAI_API_KEY")) return "openai";
  return "mock";
}

/** Split a data URL ("data:image/png;base64,XXXX") into media type + raw base64. */
function parseDataUrl(dataUrl: string): { mediaType: string; data: string } | null {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]*)$/.exec(dataUrl);
  if (!m) return null;
  return { mediaType: m[1], data: m[2] };
}

// ─── Anthropic (Claude) backend ──────────────────────────────────────────
async function generateWithAnthropic(prompt: string, imageBase64?: string): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  // Default to the latest Opus; override per-deployment with ANTHROPIC_MODEL.
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-7";

  // Build the user content: optional image (as base64 source) + the text prompt.
  const content: Anthropic.ContentBlockParam[] = [];
  if (imageBase64) {
    const parsed = parseDataUrl(imageBase64);
    if (parsed) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: parsed.mediaType as
            | "image/jpeg"
            | "image/png"
            | "image/gif"
            | "image/webp",
          data: parsed.data,
        },
      });
    }
  }
  content.push({
    type: "text",
    text: prompt || "Generate a WhatsApp message template based on this image.",
  });

  const response = await client.messages.create({
    model,
    max_tokens: 400,
    // Prompt caching on the (stable) system prompt. The current prompt is short
    // so it won't actually cache until it grows past the model's minimum prefix,
    // but this is the correct placement for when it does.
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content }],
    // No thinking block: this is a short, low-complexity generation — adaptive
    // thinking would add latency/cost without benefit. (Opus 4.7 runs without
    // thinking by default when the field is omitted.)
  });

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

// ─── OpenAI backend ──────────────────────────────────────────────────────
async function generateWithOpenAI(prompt: string, imageBase64?: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY!;
  const model = process.env.OPENAI_MODEL || "gpt-4o";

  const messages: any[] = [{ role: "system", content: SYSTEM_PROMPT }];
  if (imageBase64) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: prompt || "Generate a WhatsApp message template based on this image." },
        { type: "image_url", image_url: { url: imageBase64 } },
      ],
    });
  } else {
    messages.push({ role: "user", content: prompt });
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 300 }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "OpenAI request failed");
  }
  return data.choices?.[0]?.message?.content?.trim() || "";
}

// ─── Mock backend ────────────────────────────────────────────────────────
function generateMock(): string {
  const mockTemplates = [
    "Hey {{name}}! 🎉 Exciting news — our summer sale is live with 30% off all plans this weekend only. Don't miss out!",
    "Hi {{name}}! We wanted you to be the first to know — our biggest sale of the year is here. Grab {{discount}} off before {{date}}!",
    "Hello {{name}}! 👋 Thanks for being a valued customer. Here's an exclusive {{discount}} discount just for you. Valid until {{date}}.",
  ];
  return mockTemplates[Math.floor(Math.random() * mockTemplates.length)];
}

export async function POST(req: Request) {
  try {
    // FIX (C1): authentication gate — reject anonymous callers.
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { prompt, imageBase64 } = await req.json();

    if (!prompt?.trim() && !imageBase64) {
      return NextResponse.json({ error: "Prompt or image is required" }, { status: 400 });
    }

    const provider = resolveProvider();

    if (provider === "mock") {
      return NextResponse.json({ result: generateMock(), mock: true, provider });
    }

    const result =
      provider === "anthropic"
        ? await generateWithAnthropic(prompt, imageBase64)
        : await generateWithOpenAI(prompt, imageBase64);

    return NextResponse.json({ result, provider });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
