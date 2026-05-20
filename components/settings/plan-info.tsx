import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function PlanInfoCard({
  dailyLimit,
  todayUsage,
}: {
  dailyLimit: number;
  todayUsage: number;
}) {
  const percentage = Math.min(100, Math.round((todayUsage / dailyLimit) * 100));

  return (
    <Card className="border-zinc-200">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-black">Plan Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">Current Plan</span>
          <span className="font-medium text-black">Starter</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">Daily Limit</span>
            <span className="text-black">
              {todayUsage} / {dailyLimit}
            </span>
          </div>
          <Progress value={percentage} className="h-2 bg-zinc-100 [&>div]:bg-black" />
        </div>
      </CardContent>
    </Card>
  );
}
