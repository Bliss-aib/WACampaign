"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CampaignStatusBadge } from "./campaign-status-badge";
import { Campaign } from "@/lib/mock-data";
import { format } from "date-fns";

export function CampaignsTable({ campaigns }: { campaigns: Campaign[] }) {
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
