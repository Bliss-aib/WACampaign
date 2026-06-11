import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { encrypt } from "@/lib/encrypt";
import { getUserId, getOrCreateBusinessId } from "@/lib/auth";
import { businessConnectSchema } from "@/lib/validation";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getOrCreateBusinessId(userId);

  const { data, error } = await supabase
    .from("businesses")
    .select("name, connection_status, daily_limit, waba_id, phone_number_id")
    .eq("user_id", userId)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ business: data });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getOrCreateBusinessId(userId);

  // FIX (H9): validate connection details before encrypting/storing.
  const parsed = businessConnectSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { access_token, waba_id, phone_number_id, name } = parsed.data;

  // FIX: encrypt() throws if ENCRYPTION_KEY is not configured (a common
  // deploy-time misconfiguration on a fresh host). Catch it and return a clear
  // JSON error instead of an opaque 500 with no body — otherwise the dashboard
  // can only show its generic "Failed to connect" fallback and the real cause
  // (missing env var) stays hidden.
  let encryptedToken: string;
  try {
    encryptedToken = encrypt(access_token);
  } catch (e: any) {
    console.error("[business] token encryption failed:", e?.message);
    return NextResponse.json(
      { error: "Server is misconfigured (ENCRYPTION_KEY missing). Contact the administrator." },
      { status: 500 }
    );
  }

  // FIX: getOrCreateBusinessId (above) guarantees a row already exists for this
  // user_id. Without an explicit onConflict target, upsert defaults to the
  // primary key (id) — it generates a NEW id, attempts an INSERT, and collides
  // with the user_id UNIQUE constraint → 500. Conflict-resolve on user_id so the
  // existing row is UPDATED instead.
  const { data, error } = await supabase
    .from("businesses")
    .upsert(
      {
        user_id: userId,
        name: name || "My Business",
        access_token: encryptedToken,
        waba_id,
        phone_number_id,
        connection_status: "connected",
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ business: data });
}

export async function DELETE() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getOrCreateBusinessId(userId);

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
