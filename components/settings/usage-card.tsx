import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function UsageCard({
  todayUsage,
  dailyLimit,
}: {
  todayUsage: number;
  dailyLimit: number;
}) {
  const percentage = Math.min(100, Math.round((todayUsage / dailyLimit) * 100));
  const remaining = Math.max(0, dailyLimit - todayUsage);

  return (
    <Card className="border-zinc-200 bg-white">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-black">Usage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">Daily messages</span>
          <span className="font-medium text-black">
            {todayUsage} / {dailyLimit}
          </span>
        </div>
        <Progress value={percentage} className="h-2 bg-zinc-100 [&>div]:bg-black" />
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{remaining} remaining today</span>
          <span>Resets at midnight UTC</span>
        </div>
      </CardContent>
    </Card>
  );
}
