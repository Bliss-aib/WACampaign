import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Campaign } from "@/lib/mock-data";
import { formatDistanceToNow } from "date-fns";

function CampaignStatusBadge({ status }: { status: Campaign["status"] }) {
  const variants: Record<string, string> = {
    draft: "bg-zinc-100 text-zinc-600 hover:bg-zinc-100",
    scheduled: "bg-zinc-100 text-zinc-600 hover:bg-zinc-100",
    sending: "bg-black text-white hover:bg-black",
    completed: "bg-zinc-100 text-zinc-600 hover:bg-zinc-100",
    cancelled: "bg-zinc-100 text-zinc-600 hover:bg-zinc-100",
    failed: "bg-zinc-200 text-zinc-800 hover:bg-zinc-200",
  };

  return (
    <Badge className={variants[status] ?? variants.draft} variant="secondary">
      {status}
    </Badge>
  );
}

export function RecentCampaigns({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <Card className="border-zinc-200">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold text-black">Recent Campaigns</CardTitle>
        <Link href="/campaigns" className="text-sm font-medium text-zinc-500 hover:text-black">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-zinc-100">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-black">{campaign.name}</p>
                <p className="text-xs text-zinc-400">
                  {formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true })}
                </p>
              </div>
              <CampaignStatusBadge status={campaign.status} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
