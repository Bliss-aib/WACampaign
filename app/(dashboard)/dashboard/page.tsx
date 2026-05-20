"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { DailyUsageBar } from "@/components/dashboard/daily-usage-bar";
import { RecentCampaigns } from "@/components/dashboard/recent-campaigns";
import { Skeleton } from "@/components/ui/skeleton";
import { mockCampaigns, mockBusiness } from "@/lib/mock-data";

const mockDashboardData = {
  stats: {
    sentToday: mockBusiness.todayUsage,
    deliveryRate: 0,
    activeCampaigns: mockCampaigns.filter((c) => c.status === "sending").length,
    limitRemaining: mockBusiness.dailyLimit - mockBusiness.todayUsage,
  },
  recentCampaigns: mockCampaigns.slice(0, 5).map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    createdAt: c.createdAt,
    templateName: c.templateName,
  })),
  dailyUsage: { used: mockBusiness.todayUsage, limit: mockBusiness.dailyLimit },
};

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setData(d))
      .catch(() => setData(mockDashboardData))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  const { stats, recentCampaigns, dailyUsage } = data;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Sent Today" value={stats.sentToday} subtext="messages" />
        <StatCard title="Delivery Rate" value={`${stats.deliveryRate}%`} subtext="across all campaigns" />
        <StatCard title="Active Campaigns" value={stats.activeCampaigns} subtext="currently sending" />
        <StatCard title="Limit Remaining" value={stats.limitRemaining} subtext="until midnight UTC" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DailyUsageBar used={dailyUsage.used} limit={dailyUsage.limit} />
        </div>
      </div>

      <RecentCampaigns campaigns={recentCampaigns || []} />
    </div>
  );
}
