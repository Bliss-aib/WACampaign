"use client";

import { cn } from "@/lib/utils";
import { Template } from "@/lib/mock-data";

export function TemplateSelector({
  templates,
  selectedId,
  onSelect,
}: {
  templates: Template[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {templates.map((template) => (
        <button
          key={template.id}
          onClick={() => onSelect(template.id)}
          className={cn(
            "rounded-lg border p-4 text-left transition-colors",
            selectedId === template.id
              ? "border-black bg-zinc-50"
              : "border-zinc-200 bg-white hover:border-zinc-300"
          )}
        >
          <p className="text-sm font-medium text-black">{template.name}</p>
          <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{template.body}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {template.variables.map((v) => (
              <span key={v} className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">
                {"{"}
                {"{ " + v + " }"}
                {"}"}
              </span>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}
