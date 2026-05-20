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

  const selectedTemplateObj = templates.find((t) => t.id === selectedTemplate);

  const handleSubmit = async () => {
    setSubmitting(true);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        templateId: selectedTemplate,
        contactIds: selectedContacts,
        scheduledAt: schedule || null,
      }),
    });
    if (res.ok) {
      router.push("/campaigns");
    } else {
      setSubmitting(false);
      router.push("/campaigns");
    }
  };

  const canSubmit =
    name.trim() && selectedTemplate && selectedContacts.length > 0 && schedule && !submitting;

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
          templates={templates}
          selectedId={selectedTemplate}
          onSelect={setSelectedTemplate}
        />
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
