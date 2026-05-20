"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { mockCampaigns, mockContacts } from "@/lib/mock-data";

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/campaigns/${id}/analytics`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setData(d))
      .catch(() => {
        const campaign = mockCampaigns.find((c) => c.id === id);
        const statuses = ["sent", "delivered", "read", "failed", "pending"] as const;
        const contacts = mockContacts.slice(0, 5).map((contact, i) => ({
          ...contact,
          status: statuses[i % statuses.length],
        }));
        setData({ campaign, contacts });
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (data.error || !data.campaign) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-sm text-zinc-500">Campaign not found</p>
      </div>
    );
  }

  const { campaign, contacts } = data;

  const progress =
    (campaign.total_contacts || campaign.totalContacts || 0) > 0
      ? Math.round(
          ((campaign.sent_count || campaign.sentCount || 0) /
            (campaign.total_contacts || campaign.totalContacts || 0)) *
            100
        )
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/campaigns">
          <Button variant="outline" size="icon" className="border-zinc-200 text-black hover:bg-zinc-50">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-lg font-semibold text-black">{campaign.name}</h2>
          <div className="mt-1 flex items-center gap-2">
            <CampaignStatusBadge status={campaign.status} />
            <span className="text-xs text-zinc-400">
              Created {format(new Date(campaign.created_at || campaign.createdAt), "MMM d, yyyy")}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Sent" value={campaign.sent_count || campaign.sentCount || 0} />
        <StatCard title="Delivered" value={campaign.delivered_count || campaign.deliveredCount || 0} />
        <StatCard title="Read" value={campaign.read_count || campaign.readCount || 0} />
        <StatCard title="Failed" value={campaign.failed_count || campaign.failedCount || 0} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-black">Progress</span>
          <span className="text-zinc-500">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2 bg-zinc-100 [&>div]:bg-black" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 lg:col-span-1">
          <p className="text-sm font-medium text-black">Campaign Info</p>
          <Separator className="my-3 bg-zinc-100" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Template</span>
              <span className="text-black">{campaign.templates?.name || campaign.templateName || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Scheduled</span>
              <span className="text-black">
                {campaign.scheduled_at || campaign.scheduledAt
                  ? format(new Date(campaign.scheduled_at || campaign.scheduledAt), "MMM d, h:mm a")
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Total Contacts</span>
              <span className="text-black">{campaign.total_contacts || campaign.totalContacts || 0}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 lg:col-span-2">
          <p className="text-sm font-medium text-black">Contact Activity</p>
          <Separator className="my-3 bg-zinc-100" />
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-200 hover:bg-transparent">
                <TableHead className="text-zinc-500">Name</TableHead>
                <TableHead className="text-zinc-500">Phone</TableHead>
                <TableHead className="text-zinc-500">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(contacts || []).map((contact: any) => (
                <TableRow key={contact.id} className="border-zinc-100">
                  <TableCell className="text-sm font-medium text-black">
                    {contact.name || contact.contacts?.name}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-600">
                    {contact.phone_number || contact.phoneNumber || contact.contacts?.phone_number}
                  </TableCell>
                  <TableCell>
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 capitalize">
                      {contact.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
