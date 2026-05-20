import { Badge } from "@/components/ui/badge";
import { CampaignStatus } from "@/lib/mock-data";

const styles: Record<CampaignStatus, string> = {
  draft: "bg-zinc-100 text-zinc-600 hover:bg-zinc-100",
  scheduled: "bg-zinc-100 text-zinc-600 hover:bg-zinc-100",
  sending: "bg-black text-white hover:bg-black",
  completed: "bg-zinc-100 text-zinc-600 hover:bg-zinc-100",
  cancelled: "bg-zinc-100 text-zinc-600 hover:bg-zinc-100",
  failed: "bg-zinc-200 text-zinc-800 hover:bg-zinc-200",
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <Badge className={styles[status]} variant="secondary">
      {status}
    </Badge>
  );
}
