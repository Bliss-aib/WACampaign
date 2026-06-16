"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CampaignsTable } from "@/components/campaigns/campaigns-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CampaignStatus, mockCampaigns } from "@/lib/mock-data";

const filters: { label: string; value: CampaignStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Sending", value: "sending" },
  { label: "Paused", value: "paused" },
  { label: "Completed", value: "completed" },
  { label: "Draft", value: "draft" },
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<CampaignStatus | "all">("all");

  const fetchCampaigns = (status?: string) => {
    setLoading(true);
    const url = status && status !== "all" ? `/api/campaigns?status=${status}` : "/api/campaigns";
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setCampaigns(d.campaigns || []))
      .catch(() => {
        if (status && status !== "all") {
          setCampaigns(mockCampaigns.filter((c) => c.status === status));
        } else {
          setCampaigns(mockCampaigns);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCampaigns(activeFilter);
  }, [activeFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-black">Campaigns</h2>
        <Link href="/campaigns/new">
          <Button className="bg-black text-white hover:bg-zinc-800">New Campaign</Button>
        </Link>
      </div>

      <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as CampaignStatus | "all")}>
        <TabsList className="bg-zinc-100">
          {filters.map((f) => (
            <TabsTrigger
              key={f.value}
              value={f.value}
              className="data-[state=active]:bg-black data-[state=active]:text-white"
            >
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : (
        <CampaignsTable campaigns={campaigns} onChange={() => fetchCampaigns(activeFilter)} />
      )}
    </div>
  );
}
