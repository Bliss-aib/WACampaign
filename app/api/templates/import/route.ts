// FEATURE (Import from Meta): recover templates that exist on the Meta WABA but
// are missing locally (e.g. after deleting the account and signing back in).
//
// Outbound call (server -> Meta), so it works on localhost. Triggered by the
// "Import from Meta" button on the Templates page.

import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getUserId, getOrCreateBusinessId } from "@/lib/auth";
import { importTemplatesFromMeta } from "@/lib/submit-template";

async function getBusinessId(userId: string) {
  const { data } = await supabase.from("businesses").select("id").eq("user_id", userId).single();
  return data?.id;
}

export async function POST() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getOrCreateBusinessId(userId);

  const businessId = await getBusinessId(userId);
  if (!businessId) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const result = await importTemplatesFromMeta(businessId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, imported: result.imported });
}
