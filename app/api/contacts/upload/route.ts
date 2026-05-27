import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getUserId, getOrCreateBusinessId } from "@/lib/auth";
import Papa from "papaparse";

async function getBusinessId(userId: string) {
  const { data } = await supabase.from("businesses").select("id").eq("user_id", userId).single();
  return data?.id;
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getOrCreateBusinessId(userId);

  const businessId = await getBusinessId(userId);
  if (!businessId) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    return NextResponse.json({ error: "CSV parse error", details: parsed.errors }, { status: 400 });
  }

  const rows = parsed.data;
  const contacts: { name: string; phone_number: string }[] = [];

  for (const row of rows) {
    const name = row.name || row.Name || row.NAME || "";
    const phone = row.phone_number || row.phone || row.Phone || row.PhoneNumber || row["phone number"] || "";
    if (name.trim() && phone.trim()) {
      contacts.push({ name: name.trim(), phone_number: phone.trim() });
    }
  }

  if (contacts.length === 0) {
    return NextResponse.json({ error: "No valid contacts found" }, { status: 400 });
  }

  const insertRows = contacts.map((c) => ({
    business_id: businessId,
    name: c.name,
    phone_number: c.phone_number,
  }));

  const { data, error } = await supabase.from("contacts").insert(insertRows).select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inserted: data?.length || 0 });
}
