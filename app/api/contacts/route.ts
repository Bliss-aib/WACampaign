import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getUserId, getOrCreateBusinessId } from "@/lib/auth";

async function getBusinessId(userId: string) {
  const { data } = await supabase.from("businesses").select("id").eq("user_id", userId).single();
  return data?.id;
}

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getOrCreateBusinessId(userId);

  const businessId = await getBusinessId(userId);
  if (!businessId) return NextResponse.json({ contacts: [] });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  let query = supabase
    .from("contacts")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`name.ilike.%${q}%,phone_number.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // FIX: the DB returns snake_case columns (phone_number, created_at) but the UI
  // (ContactsTable, the Contact type, search filter, optimistic-add) all expect
  // camelCase. Without mapping, the phone column renders empty and the date shows
  // "Invalid Date" (new Date(undefined)). Normalize to camelCase here.
  const contacts = (data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    phoneNumber: c.phone_number,
    createdAt: c.created_at,
  }));

  return NextResponse.json({ contacts });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getOrCreateBusinessId(userId);

  const businessId = await getBusinessId(userId);
  if (!businessId) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { name, phone_number } = await req.json();

  const { data, error } = await supabase
    .from("contacts")
    .insert({ business_id: businessId, name, phone_number })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contact: data });
}
