import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { encrypt } from "@/lib/encrypt";

export async function GET() {
  const userId = "dev-user";

  const { data, error } = await supabase
    .from("businesses")
    .select("name, connection_status, daily_limit, waba_id, phone_number_id")
    .eq("user_id", userId)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ business: data });
}

export async function POST(req: Request) {
  const userId = "dev-user";

  const { access_token, waba_id, phone_number_id, name } = await req.json();

  const encryptedToken = encrypt(access_token);

  const { data, error } = await supabase
    .from("businesses")
    .upsert({
      user_id: userId,
      name: name || "My Business",
      access_token: encryptedToken,
      waba_id,
      phone_number_id,
      connection_status: "connected",
      updated_at: new Date().toISOString(),
    } as any)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ business: data });
}

export async function DELETE() {
  const userId = "dev-user";

  const { error } = await supabase
    .from("businesses")
    .update({
      connection_status: "disconnected",
      access_token: null,
      waba_id: null,
      phone_number_id: null,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
