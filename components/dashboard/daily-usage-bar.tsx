import { Progress } from "@/components/ui/progress";

interface DailyUsageBarProps {
  used: number;
  limit: number;
}

export function DailyUsageBar({ used, limit }: DailyUsageBarProps) {
  const percentage = Math.min(100, Math.round((used / limit) * 100));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-black">Daily Sending Limit</span>
        <span className="text-zinc-500">
          {used} / {limit}
        </span>
      </div>
      <Progress value={percentage} className="h-2 bg-zinc-100 [&>div]:bg-black" />
      <p className="text-xs text-zinc-400">Resets at midnight UTC</p>
    </div>
  );
}
