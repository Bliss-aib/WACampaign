import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getUserId, getOrCreateBusinessId } from "@/lib/auth";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getOrCreateBusinessId(userId);

  const { data: business } = await supabase
    .from("businesses")
    .select("id, daily_limit")
    .eq("user_id", userId)
    .single();

  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const today = new Date().toISOString().split("T")[0];

  const { data: usage } = await supabase
    .from("daily_usage")
    .select("count")
    .eq("business_id", business.id)
    .eq("date", today)
    .single();

  const count = usage?.count || 0;

  return NextResponse.json({
    used: count,
    limit: business.daily_limit,
    remaining: Math.max(0, business.daily_limit - count),
  });
}
