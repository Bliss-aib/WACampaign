import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt, imageBase64 } = await req.json();

    if (!prompt?.trim() && !imageBase64) {
      return NextResponse.json(
        { error: "Prompt or image is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey.startsWith("your_")) {
      // Fallback mock response when no real key is configured
      const mockTemplates = [
        "Hey {{name}}! 🎉 Exciting news — our summer sale is live with 30% off all plans this weekend only. Don't miss out!",
        "Hi {{name}}! We wanted you to be the first to know — our biggest sale of the year is here. Grab {{discount}} off before {{date}}!",
        "Hello {{name}}! 👋 Thanks for being a valued customer. Here's an exclusive {{discount}} discount just for you. Valid until {{date}}.",
      ];
      const result = mockTemplates[Math.floor(Math.random() * mockTemplates.length)];
      return NextResponse.json({ result, mock: true });
    }

    const messages: any[] = [
      {
        role: "system",
        content:
          "You are a WhatsApp marketing expert. Generate concise, friendly message templates based on the user's prompt and any uploaded image. Use {{variable}} syntax for dynamic values like names, dates, prices, etc. Keep it under 500 characters. Output ONLY the message body, nothing else.",
      },
    ];

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
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message || "OpenAI request failed" },
        { status: 500 }
      );
    }

    const result = data.choices?.[0]?.message?.content?.trim() || "";
    return NextResponse.json({ result });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
