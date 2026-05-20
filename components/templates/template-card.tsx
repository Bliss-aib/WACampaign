import { Template } from "@/lib/mock-data";
import Image from "next/image";
import { Pencil, Trash2 } from "lucide-react";

export function TemplateCard({
  template,
  onDelete,
  onEdit,
}: {
  template: Template;
  onDelete: (id: string) => void;
  onEdit: (template: Template) => void;
}) {
  const images = template.imageUrls || [];
  const hasImages = images.length > 0;

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
          <p className="text-sm font-medium text-black line-clamp-1">{template.name}</p>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onEdit(template)}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-black transition-colors"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(template.id)}
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
      </div>
    </div>
  );
}
