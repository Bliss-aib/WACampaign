"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CampaignStatusBadge } from "./campaign-status-badge";
import { Campaign } from "@/lib/mock-data";
import { format } from "date-fns";
import { toast } from "sonner";

const STARTABLE_STATUSES = ["draft", "scheduled", "paused"];

export function CampaignsTable({
  campaigns,
  onChange,
}: {
  campaigns: Campaign[];
  onChange?: () => void;
}) {
  if (campaigns.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-zinc-200 bg-white">
        <p className="text-sm text-zinc-400">No campaigns found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-200 hover:bg-transparent">
            <TableHead className="text-zinc-500">Name</TableHead>
            <TableHead className="text-zinc-500">Template</TableHead>
            <TableHead className="text-zinc-500">Status</TableHead>
            <TableHead className="text-zinc-500">Scheduled</TableHead>
            <TableHead className="text-zinc-500">Stats</TableHead>
            <TableHead className="text-zinc-500">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow key={campaign.id} className="border-zinc-100">
              <TableCell>
                <Link
                  href={`/campaigns/${campaign.id}`}
                  className="font-medium text-black hover:underline"
                >
                  {campaign.name}
                </Link>
              </TableCell>
              <TableCell className="text-zinc-600">{campaign.templateName}</TableCell>
              <TableCell>
                <CampaignStatusBadge status={campaign.status} />
              </TableCell>
              <TableCell className="text-zinc-600">
                {campaign.scheduledAt
                  ? format(new Date(campaign.scheduledAt), "MMM d, yyyy h:mm a")
                  : "—"}
              </TableCell>
              <TableCell className="text-sm text-zinc-600">
                {campaign.sentCount}/{campaign.deliveredCount}/{campaign.readCount}
                <span className="ml-1 text-xs text-zinc-400">(sent/deliv/read)</span>
              </TableCell>
              <TableCell>
                <CampaignActions campaign={campaign} onChange={onChange} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CampaignActions({
  campaign,
  onChange,
}: {
  campaign: Campaign;
  onChange?: () => void;
}) {
  const [loading, setLoading] = useState(false);

  if (!STARTABLE_STATUSES.includes(campaign.status)) {
    return <span className="text-xs text-zinc-400">—</span>;
  }

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/start`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to start campaign");
        return;
      }
      toast.success("Campaign started");
      onChange?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={loading}
      onClick={handleStart}
      className="border-zinc-200 text-black hover:bg-zinc-50 disabled:bg-zinc-200 disabled:text-zinc-400"
    >
      {loading ? "Starting..." : "Start Now"}
    </Button>
  );
}
