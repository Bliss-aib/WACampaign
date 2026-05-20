"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Campaign } from "@/lib/mock-data";
import { BarChart3, TrendingUp, Mail, AlertCircle } from "lucide-react";

interface TemplateAnalyticsProps {
  campaigns: Campaign[];
}

interface TemplateStat {
  name: string;
  usedCount: number;
  totalContacts: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
}

export function TemplateAnalytics({ campaigns }: TemplateAnalyticsProps) {
  const stats = useMemo(() => {
    const map = new Map<string, TemplateStat>();

    for (const c of campaigns) {
      const existing = map.get(c.templateName);
      if (existing) {
        existing.usedCount += 1;
        existing.totalContacts += c.totalContacts;
        existing.sentCount += c.sentCount;
        existing.deliveredCount += c.deliveredCount;
        existing.readCount += c.readCount;
        existing.failedCount += c.failedCount;
      } else {
        map.set(c.templateName, {
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

    const rows = Array.from(map.values()).sort((a, b) => b.sentCount - a.sentCount);

    const totalMessages = rows.reduce((sum, r) => sum + r.sentCount, 0);
    const totalDelivered = rows.reduce((sum, r) => sum + r.deliveredCount, 0);
    const totalRead = rows.reduce((sum, r) => sum + r.readCount, 0);
    const totalFailed = rows.reduce((sum, r) => sum + r.failedCount, 0);

    const avgDeliveryRate = totalMessages > 0 ? Math.round((totalDelivered / totalMessages) * 100) : 0;
    const avgReadRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;
    const mostUsed = rows[0]?.name ?? "—";

    return {
      rows,
      totalMessages,
      totalDelivered,
      totalRead,
      totalFailed,
      avgDeliveryRate,
      avgReadRate,
      mostUsed,
      templateCount: rows.length,
    };
  }, [campaigns]);

  if (stats.rows.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-black flex items-center gap-2">
        <BarChart3 className="h-5 w-5" />
        Template Analytics
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
            <p className="mt-1 text-xs text-zinc-400">Across all templates</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Delivery Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-black">
              {stats.avgDeliveryRate}%
            </div>
            <p className="mt-1 text-xs text-zinc-400">Messages successfully delivered</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Most Used Template
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold tracking-tight text-black truncate">
              {stats.mostUsed}
            </div>
            <p className="mt-1 text-xs text-zinc-400">Highest campaign usage</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Failed Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-black">
              {stats.totalFailed.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-zinc-400">Total failed deliveries</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-template table */}
      <Card className="border-zinc-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-black">Performance by Template</CardTitle>
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
              {stats.rows.map((row) => {
                const deliveryRate = row.sentCount > 0 ? Math.round((row.deliveredCount / row.sentCount) * 100) : 0;
                return (
                  <TableRow key={row.name}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-right">{row.usedCount}</TableCell>
                    <TableCell className="text-right">{row.sentCount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{row.deliveredCount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{row.readCount.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={deliveryRate} className="h-2 bg-zinc-100 [&>div]:bg-black" />
                        <span className="text-xs text-zinc-500 w-8 text-right">{deliveryRate}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
