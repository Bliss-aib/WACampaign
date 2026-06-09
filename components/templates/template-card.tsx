import { Template, TemplateStatus } from "@/lib/mock-data";
import Image from "next/image";
import { Pencil, Trash2, Send } from "lucide-react";

// FEATURE: Meta Template Management — visual config for each approval status.
const STATUS_CONFIG: Record<TemplateStatus, { label: string; className: string }> = {
  local:    { label: "Not submitted", className: "bg-zinc-100 text-zinc-600" },
  pending:  { label: "Pending review", className: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  paused:   { label: "Paused", className: "bg-orange-100 text-orange-700" },
  disabled: { label: "Disabled", className: "bg-zinc-200 text-zinc-700" },
};

export function TemplateCard({
  template,
  onDelete,
  onEdit,
  onSubmit,
}: {
  template: Template;
  onDelete: (id: string) => void;
  onEdit: (template: Template) => void;
  // FEATURE: submit a local/rejected template to Meta for approval.
  onSubmit: (id: string) => void;
}) {
  const images = template.imageUrls || [];
  const hasImages = images.length > 0;

  // Default to "local" when the field is absent (e.g. mock data).
  const status: TemplateStatus = template.status || "local";
  // FIX (M3): an unexpected status value (not in STATUS_CONFIG) made statusCfg
  // undefined and crashed on statusCfg.label/className. Fall back to the 'local'
  // styling for any unknown status.
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.local;
  // A template can be (re)submitted to Meta when it hasn't been approved yet.
  const canSubmit = status === "local" || status === "rejected";

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      {hasImages && (
        <div className="relative h-28 w-full bg-zinc-100">
          {images.length === 1 ? (
            <Image
              src={images[0]}
              alt={template.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="grid h-full grid-cols-2 gap-0.5">
              {images.slice(0, 4).map((url, i) => (
                <div key={i} className="relative bg-zinc-200 overflow-hidden">
                  <Image
                    src={url}
                    alt={`${template.name} ${i + 1}`}
                    fill
                    className="object-cover"
                  />
                  {i === 3 && images.length > 4 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <span className="text-sm font-bold text-white">+{images.length - 4}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="absolute top-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white backdrop-blur-sm">
            {images.length} image{images.length > 1 ? "s" : ""}
          </div>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-black line-clamp-1">{template.name}</p>
            {/* FEATURE: Meta approval status badge */}
            <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${statusCfg.className}`}>
              {statusCfg.label}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* FEATURE: submit to Meta when not yet approved */}
            {canSubmit && (
              <button
                onClick={() => onSubmit(template.id)}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-emerald-600 transition-colors"
                title="Submit to Meta for approval"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => onEdit(template)}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-black transition-colors"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              // FIX #3: The delete button used to fire immediately on a single
              // click with no warning. Add a native confirm() prompt so an
              // accidental click can't wipe a template. (A styled modal can
              // replace this later, but confirm() is a safe, dependency-free guard.)
              onClick={() => {
                if (window.confirm(`Delete template "${template.name}"? This cannot be undone.`)) {
                  onDelete(template.id);
                }
              }}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-500 line-clamp-3">{template.body}</p>
        <div className="mt-3 flex flex-wrap gap-1">
          {template.variables.map((v) => (
            <span key={v} className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">
              {"{"}
              {"{" + v + "}"}
              {"}"}
            </span>
          ))}
        </div>
        {/* FEATURE: show Meta's rejection reason so the user knows what to fix */}
        {status === "rejected" && template.rejection_reason && (
          <p className="mt-3 rounded bg-red-50 px-2 py-1.5 text-[11px] text-red-700">
            <span className="font-medium">Rejected:</span> {template.rejection_reason}
          </p>
        )}
      </div>
    </div>
  );
}
