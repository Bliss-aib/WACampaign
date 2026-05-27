// FEATURE: Meta Template Management — manual "Submit to Meta" endpoint.
//
// Used for templates that were created before auto-submit existed, or whose
// earlier submission failed (e.g. WhatsApp wasn't connected yet). Pushes the
// template to Meta for approval and returns the resulting status.

import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getUserId, getOrCreateBusinessId } from "@/lib/auth";
import { submitTemplate } from "@/lib/submit-template";

async function getBusinessId(userId: string) {
  const { data } = await supabase.from("businesses").select("id").eq("user_id", userId).single();
  return data?.id;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getOrCreateBusinessId(userId);

  const businessId = await getBusinessId(userId);
  if (!businessId) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { id } = await params;

  const result = await submitTemplate(id, businessId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, status: result.status });
}
