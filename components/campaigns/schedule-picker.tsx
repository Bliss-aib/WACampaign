"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SchedulePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-black">Schedule Date & Time</Label>
      <Input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-zinc-200 text-black focus-visible:ring-black"
      />
      <p className="text-xs text-zinc-400">Campaign will be sent automatically at this time.</p>
    </div>
  );
}
