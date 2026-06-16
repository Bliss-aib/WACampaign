"use client";

import { useEffect, useState } from "react";
import { UsageCard } from "@/components/settings/usage-card";
import { PlanInfoCard } from "@/components/settings/plan-info";
import { Skeleton } from "@/components/ui/skeleton";
import { mockBusiness } from "@/lib/mock-data";

export default function UsagePage() {
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/usage")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((u) => setUsage(u || null))
      .catch(() => setUsage({ used: mockBusiness.todayUsage, limit: mockBusiness.dailyLimit }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  const dailyLimit = usage?.limit || 250;
  const todayUsage = usage?.used || 0;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-black">Usage</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <UsageCard dailyLimit={dailyLimit} todayUsage={todayUsage} />
        <PlanInfoCard dailyLimit={dailyLimit} todayUsage={todayUsage} />
      </div>
    </div>
  );
}
