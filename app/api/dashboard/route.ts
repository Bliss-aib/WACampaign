import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";

export async function GET() {
  const userId = "dev-user";

  const { data: business } = await supabase
    .from("businesses")
    .select("id, daily_limit")
    .eq("user_id", userId)
    .single();

  if (!business) {
    return NextResponse.json({
      stats: { sentToday: 0, deliveryRate: 0, activeCampaigns: 0, limitRemaining: 0 },
      recentCampaigns: [],
      dailyUsage: { used: 0, limit: 250 },
    });
  }

  const today = new Date().toISOString().split("T")[0];

  const { data: usage } = await supabase
    .from("daily_usage")
    .select("count")
    .eq("business_id", business.id)
    .eq("date", today)
    .single();

  const sentToday = usage?.count || 0;

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("*, templates(name)")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const allCampaigns = campaigns || [];
  const totalSent = allCampaigns.reduce((acc: number, c: any) => acc + (c.sent_count || 0), 0);
  const totalDelivered = allCampaigns.reduce((acc: number, c: any) => acc + (c.delivered_count || 0), 0);
  const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
  const activeCampaigns = allCampaigns.filter((c: any) => c.status === "sending").length;

  return NextResponse.json({
    stats: {
      sentToday,
      deliveryRate,
      activeCampaigns,
      limitRemaining: Math.max(0, business.daily_limit - sentToday),
    },
    recentCampaigns: allCampaigns.map((c: any) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      createdAt: c.created_at,
      templateName: c.templates?.name || "",
    })),
    dailyUsage: { used: sentToday, limit: business.daily_limit },
  });
}
