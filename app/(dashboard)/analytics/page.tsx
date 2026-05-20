"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { mockCampaigns, Campaign } from "@/lib/mock-data";
import {
  BarChart3,
  TrendingUp,
  Mail,
  AlertCircle,
  Eye,
  CheckCircle2,
} from "lucide-react";

interface TemplateStat {
  name: string;
  usedCount: number;
  totalContacts: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
}

export default function AnalyticsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setCampaigns(d.campaigns || []))
      .catch(() => setCampaigns(mockCampaigns))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const totalMessages = campaigns.reduce((s, c) => s + c.sentCount, 0);
    const totalDelivered = campaigns.reduce((s, c) => s + c.deliveredCount, 0);
    const totalRead = campaigns.reduce((s, c) => s + c.readCount, 0);
    const totalFailed = campaigns.reduce((s, c) => s + c.failedCount, 0);
    const totalContacts = campaigns.reduce((s, c) => s + c.totalContacts, 0);

    const deliveryRate = totalMessages > 0 ? Math.round((totalDelivered / totalMessages) * 100) : 0;
    const readRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;

    const templateMap = new Map<string, TemplateStat>();
    for (const c of campaigns) {
      const existing = templateMap.get(c.templateName);
      if (existing) {
        existing.usedCount += 1;
        existing.totalContacts += c.totalContacts;
        existing.sentCount += c.sentCount;
        existing.deliveredCount += c.deliveredCount;
        existing.readCount += c.readCount;
        existing.failedCount += c.failedCount;
      } else {
        templateMap.set(c.templateName, {
          name: c.templateName,
          usedCount: 1,
          totalContacts: c.totalContacts,
          sentCount: c.sentCount,
          deliveredCount: c.deliveredCount,
          readCount: c.readCount,
          failedCount: c.failedCount,
        });
      }
    }
    const templateRows = Array.from(templateMap.values()).sort((a, b) => b.sentCount - a.sentCount);

    return {
      totalMessages,
      totalDelivered,
      totalRead,
      totalFailed,
      totalContacts,
      deliveryRate,
      readRate,
      templateRows,
    };
  }, [campaigns]);

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold text-black flex items-center gap-2">
        <BarChart3 className="h-5 w-5" />
        Analytics
      </h2>

      {/* Top stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Total Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-black">
              {stats.totalMessages.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-zinc-400">Across all campaigns</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Delivery Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-black">
              {stats.deliveryRate}%
            </div>
            <p className="mt-1 text-xs text-zinc-400">{stats.totalDelivered.toLocaleString()} delivered</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Read Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-black">
              {stats.readRate}%
            </div>
            <p className="mt-1 text-xs text-zinc-400">{stats.totalRead.toLocaleString()} read</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-black">
              {stats.totalFailed.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-zinc-400">Failed deliveries</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign performance */}
      <Card className="border-zinc-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-black flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Campaign Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Template</TableHead>
                <TableHead className="text-right">Contacts</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Delivered</TableHead>
                <TableHead className="text-right">Read</TableHead>
                <TableHead className="w-32">Delivery</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => {
                const rate = c.sentCount > 0 ? Math.round((c.deliveredCount / c.sentCount) * 100) : 0;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.templateName}</TableCell>
                    <TableCell className="text-right">{c.totalContacts.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{c.sentCount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{c.deliveredCount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{c.readCount.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={rate} className="h-2 bg-zinc-100 [&>div]:bg-black" />
                        <span className="text-xs text-zinc-500 w-8 text-right">{rate}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Template performance */}
      {stats.templateRows.length > 0 && (
        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-black flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Performance by Template
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead className="text-right">Campaigns</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Read</TableHead>
                  <TableHead className="w-32">Delivery Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.templateRows.map((row) => {
                  const rate = row.sentCount > 0 ? Math.round((row.deliveredCount / row.sentCount) * 100) : 0;
                  return (
                    <TableRow key={row.name}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-right">{row.usedCount}</TableCell>
                      <TableCell className="text-right">{row.sentCount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{row.deliveredCount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{row.readCount.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={rate} className="h-2 bg-zinc-100 [&>div]:bg-black" />
                          <span className="text-xs text-zinc-500 w-8 text-right">{rate}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
