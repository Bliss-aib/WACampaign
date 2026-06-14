"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TemplateSelector } from "@/components/campaigns/template-selector";
import { ContactSelector } from "@/components/campaigns/contact-selector";
import { SchedulePicker } from "@/components/campaigns/schedule-picker";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { mockTemplates, mockContacts } from "@/lib/mock-data";
import { toast } from "sonner";

export default function NewCampaignPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [schedule, setSchedule] = useState<string>("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // FEATURE (Option A): values for the selected template's non-name variables.
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([fetch("/api/templates"), fetch("/api/contacts")])
      .then(([r1, r2]) => Promise.all([r1.ok ? r1.json() : Promise.reject(), r2.ok ? r2.json() : Promise.reject()]))
      .then(([t, c]) => {
        setTemplates(t.templates || []);
        setContacts(c.contacts || []);
      })
      .catch(() => {
        setTemplates(mockTemplates);
        setContacts(mockContacts);
      })
      .finally(() => setLoading(false));
  }, []);

  // FEATURE: Only APPROVED templates can be used in a campaign — Meta rejects
  // sends for templates that aren't approved. We hide the rest and explain why.
  const approvedTemplates = templates.filter((t) => (t.status || "approved") === "approved");
  const hiddenCount = templates.length - approvedTemplates.length;

  const selectedTemplateObj = approvedTemplates.find((t) => t.id === selectedTemplate);

  // FEATURE (Option A): the non-name variables that need a campaign-level value.
  // {{name}} is filled per-contact, so it's excluded here.
  const fillableVars: string[] = (selectedTemplateObj?.variables || []).filter((v: string) => v !== "name");
  const allVarsFilled = fillableVars.every((v) => (variableValues[v] || "").trim().length > 0);

  const handleSubmit = async () => {
    setSubmitting(true);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        templateId: selectedTemplate,
        contactIds: selectedContacts,
        // FIX (timezone): the datetime-local input gives a naive string like
        // "2026-06-14T21:09" with no zone. Convert it to a real UTC ISO here in
        // the browser — where the user's timezone is known — so the server
        // stores the correct instant. Previously the raw string was sent and the
        // UTC server parsed it as UTC, shifting the time by the user's offset.
        scheduledAt: schedule ? new Date(schedule).toISOString() : null,
        variableValues, // FEATURE (Option A)
      }),
    });
    // FIX (H6): the old code redirected to /campaigns on BOTH success and
    // failure, so a failed creation silently discarded the user's work and they
    // never saw the error. Only navigate on success; otherwise surface the error
    // and keep the form intact so they can retry.
    if (res.ok) {
      router.push("/campaigns");
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Failed to create campaign");
      setSubmitting(false);
    }
  };

  const canSubmit =
    name.trim() &&
    selectedTemplate &&
    selectedContacts.length > 0 &&
    schedule &&
    allVarsFilled && // FEATURE (Option A): all non-name variables must have a value
    !submitting;

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-black">New Campaign</h2>
          <p className="text-sm text-zinc-500">Select a template, contacts, and schedule.</p>
        </div>
        <Link href="/campaigns">
          <Button variant="outline" className="border-zinc-200 text-black hover:bg-zinc-50">
            Cancel
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-black">Campaign Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Summer Sale Blast"
          className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-black placeholder:text-zinc-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        />
      </div>

      <Separator className="bg-zinc-100" />

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-black">1. Select Template</h3>
        <TemplateSelector
          templates={approvedTemplates}
          selectedId={selectedTemplate}
          onSelect={setSelectedTemplate}
        />
        {/* FEATURE: explain why some templates aren't selectable */}
        {hiddenCount > 0 && (
          <p className="text-xs text-zinc-500">
            {hiddenCount} template{hiddenCount > 1 ? "s are" : " is"} hidden because{" "}
            {hiddenCount > 1 ? "they are" : "it is"} not yet approved by Meta. Submit and get
            approval on the Templates page first.
          </p>
        )}

        {/* FEATURE (Option A): collect values for the selected template's non-name
            variables. These apply to every recipient. {{name}} is filled per-contact. */}
        {fillableVars.length > 0 && (
          <div className="mt-2 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-medium text-black">Fill in template variables</p>
            <p className="text-xs text-zinc-500">
              These values are sent to every recipient. <code className="rounded bg-zinc-200 px-1">{"{{name}}"}</code> is
              automatically filled from each contact.
            </p>
            {fillableVars.map((v) => (
              <div key={v} className="space-y-1">
                <label className="block text-xs font-medium text-zinc-600">
                  {"{{"}{v}{"}}"}
                </label>
                <input
                  type="text"
                  value={variableValues[v] || ""}
                  onChange={(e) => setVariableValues((prev) => ({ ...prev, [v]: e.target.value }))}
                  placeholder={`Value for ${v}`}
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-black placeholder:text-zinc-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator className="bg-zinc-100" />

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-black">2. Select Contacts</h3>
        <ContactSelector
          contacts={contacts}
          selectedIds={selectedContacts}
          onChange={setSelectedContacts}
        />
      </div>

      <Separator className="bg-zinc-100" />

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-black">3. Schedule</h3>
        <SchedulePicker value={schedule} onChange={setSchedule} />
      </div>

      <Separator className="bg-zinc-100" />

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-black">4. Review</h3>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
          <p>
            <span className="font-medium text-black">Name:</span> {name || "—"}
          </p>
          <p className="mt-1">
            <span className="font-medium text-black">Template:</span>{" "}
            {selectedTemplateObj?.name || "—"}
          </p>
          <p className="mt-1">
            <span className="font-medium text-black">Contacts:</span> {selectedContacts.length}
          </p>
          <p className="mt-1">
            <span className="font-medium text-black">Scheduled:</span>{" "}
            {schedule ? new Date(schedule).toLocaleString() : "—"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Link href="/campaigns">
          <Button variant="outline" className="border-zinc-200 text-black hover:bg-zinc-50">
            Cancel
          </Button>
        </Link>
        <Button
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="bg-black text-white hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400"
        >
          {submitting ? "Creating..." : "Create Campaign"}
        </Button>
      </div>
    </div>
  );
}
