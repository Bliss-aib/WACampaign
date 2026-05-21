"use client";

import { useEffect, useState } from "react";
import { TemplateCard } from "@/components/templates/template-card";
import { CreateTemplateModal } from "@/components/templates/create-template-modal";
import { TemplateLibrary, ReadyTemplate } from "@/components/templates/template-library";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { mockTemplates, Template } from "@/lib/mock-data";
// FIX #2 / #3: use toast notifications so save/delete failures are visible to the
// user instead of being silently swallowed.
import { toast } from "sonner";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ name: string; body: string; imageUrls?: string[] } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchTemplates = () => {
    setLoading(true);
    fetch("/api/templates")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setTemplates(d.templates || []))
      .catch(() => setTemplates(mockTemplates))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSave = async (name: string, body: string, imageUrls?: string[]) => {
    const vars = Array.from(new Set(body.match(/\{\{(\w+)\}\}/g) || [])).map((m) =>
      m.replace(/[{}]/g, "")
    );

    if (editingId) {
      // Update existing
      const res = await fetch(`/api/templates/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, body, variables: vars, imageUrls }),
      });
      // FIX #2: Previously, a failed save was hidden by optimistically updating
      // local state — so the user saw a "successful" edit that was never persisted
      // and vanished on refresh. Now we surface the real error and only refresh
      // from the server (the source of truth) when the save genuinely succeeded.
      if (res.ok) {
        toast.success("Template updated");
        fetchTemplates();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to update template");
      }
      setEditingId(null);
    } else {
      // Create new
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, body, variables: vars, imageUrls }),
      });
      // FIX #2: Same problem as above on create — the old code invented a fake
      // template in local state when the API failed, which is exactly why
      // templates "disappeared" after a refresh. Show the error instead.
      if (res.ok) {
        toast.success("Template created");
        fetchTemplates();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to create template");
      }
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
    // FIX #3: Previously a failed delete was hidden — the card was removed from
    // local state even though the database refused (e.g. the template is still
    // used by a campaign, protected by an ON DELETE RESTRICT constraint). On
    // refresh the "deleted" template reappeared, looking like a ghost. Now we
    // only remove it on real success and otherwise show the server's reason.
    if (res.ok) {
      toast.success("Template deleted");
      fetchTemplates();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Failed to delete template");
    }
  };

  const handleEdit = (template: Template) => {
    setEditingId(template.id);
    setPrefill({
      name: template.name,
      body: template.body,
      imageUrls: template.imageUrls,
    });
    setModalOpen(true);
  };

  const handleUseLibraryTemplate = (template: ReadyTemplate) => {
    setEditingId(null);
    setPrefill({ name: template.name, body: template.body, imageUrls: template.imageUrls });
    setModalOpen(true);
  };

  const handleModalOpenChange = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      setEditingId(null);
      setPrefill(null);
    }
  };

  return (
    <div className="space-y-10">
      {/* Templates Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black">My Templates</h2>
          <CreateTemplateModal onCreate={handleSave} />
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-lg border border-zinc-200 bg-white">
            <p className="text-sm text-zinc-400">No templates yet</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}
      </section>

      {/* Library Section */}
      <section className="space-y-6">
        <Separator className="bg-zinc-200" />
        <TemplateLibrary onUse={handleUseLibraryTemplate} />
      </section>

      {/* Controlled modal for edit + library prefill */}
      <CreateTemplateModal
        open={modalOpen}
        onOpenChange={handleModalOpenChange}
        prefill={prefill}
        onCreate={handleSave}
        isEditing={!!editingId}
      />
    </div>
  );
}
