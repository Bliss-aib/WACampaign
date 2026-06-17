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

  // FIX (H10): bound the upload. The old code accepted any file of any size with
  // no type check — a multi-GB file would be read fully into memory and crash the
  // server. Enforce a content-type, a byte-size cap, and a row-count cap.
  const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
  const MAX_ROWS = 10000;

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  // Type check: accept text/csv (and the variants browsers send) plus a .csv name.
  const okType =
    /csv|text\/plain|application\/vnd\.ms-excel/i.test(file.type) ||
    /\.csv$/i.test(file.name || "");
  if (!okType) {
    return NextResponse.json({ error: "Please upload a .csv file" }, { status: 400 });
  }

  // Size check before reading the body into memory.
  if (typeof file.size === "number" && file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large. Max ${Math.round(MAX_BYTES / 1024 / 1024)} MB.` },
      { status: 413 }
    );
  }

  const text = await file.text();
  // Defensive: guard against a missing/incorrect size header.
  if (text.length > MAX_BYTES) {
    return NextResponse.json({ error: "File too large." }, { status: 413 });
  }

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    return NextResponse.json({ error: "CSV parse error", details: parsed.errors }, { status: 400 });
  }

  const rows = parsed.data;
  if (rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `Too many rows (${rows.length}). Max ${MAX_ROWS} per upload.` },
      { status: 413 }
    );
  }
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

  // De-duplicate within the file itself first (two identical phones in one CSV
  // would otherwise collide on the unique index).
  const seen = new Set<string>();
  const insertRows = contacts
    .filter((c) => {
      if (seen.has(c.phone_number)) return false;
      seen.add(c.phone_number);
      return true;
    })
    .map((c) => ({ business_id: businessId, name: c.name, phone_number: c.phone_number }));

  // FIX: a plain batch insert is atomic — one phone that already exists for this
  // business (UNIQUE business_id, phone_number) made the WHOLE upload fail with a
  // 500 and nothing was saved. Upsert with ignoreDuplicates does
  // INSERT ... ON CONFLICT DO NOTHING, so existing numbers are skipped and the
  // new ones still import. `select()` returns only the rows actually inserted.
  const { data, error } = await supabase
    .from("contacts")
    .upsert(insertRows, { onConflict: "business_id,phone_number", ignoreDuplicates: true })
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const added = data?.length || 0;
  const skipped = insertRows.length - added;
  return NextResponse.json({ added, skipped, inserted: added });
}
