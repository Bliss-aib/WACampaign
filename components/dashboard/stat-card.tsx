import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
}

export function StatCard({ title, value, subtext }: StatCardProps) {
  return (
    <Card className="border-zinc-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight text-black">{value}</div>
        {subtext && <p className="mt-1 text-xs text-zinc-400">{subtext}</p>}
      </CardContent>
    </Card>
  );
}
