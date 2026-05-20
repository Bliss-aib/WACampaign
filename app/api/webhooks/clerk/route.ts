import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { supabase } from "@/lib/db/client";

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const payload = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id") || "",
    "svix-timestamp": req.headers.get("svix-timestamp") || "",
    "svix-signature": req.headers.get("svix-signature") || "",
  };

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: any;
  try {
    evt = wh.verify(payload, headers);
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const eventType = evt.type;

  if (eventType === "user.created") {
    await supabase.from("businesses").insert({
      user_id: evt.data.id,
      name: evt.data.first_name || "My Business",
      connection_status: "disconnected",
      daily_limit: 250,
    });
  }

  if (eventType === "user.deleted") {
    await supabase.from("businesses").delete().eq("user_id", evt.data.id);
  }

  return NextResponse.json({ success: true });
}
