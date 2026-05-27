import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getUserId, getOrCreateBusinessId } from "@/lib/auth";

async function getBusinessId(userId: string) {
  const { data } = await supabase.from("businesses").select("id").eq("user_id", userId).single();
  return data?.id;
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getOrCreateBusinessId(userId);

  const businessId = await getBusinessId(userId);
  if (!businessId) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { id } = await params;

  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
