"use client";

import { useEffect, useRef, useState } from "react";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { AddContactModal } from "@/components/contacts/add-contact-modal";
import { UploadCSVModal } from "@/components/contacts/upload-csv-modal";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { mockContacts } from "@/lib/mock-data";
// FIX: surface save/delete failures instead of silently faking them in local
// state (which made adds "disappear" on refresh — the reported bug).
import { toast } from "sonner";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  // FIX (M4/H8): track the in-flight request so we can cancel a superseded one.
  const abortRef = useRef<AbortController | null>(null);

  const fetchContacts = (q?: string) => {
    // Cancel any previous request so a slow earlier response can't overwrite the
    // results of a newer query (the "stale results" search race).
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    const url = q ? `/api/contacts?q=${encodeURIComponent(q)}` : "/api/contacts";
    fetch(url, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setContacts(d.contacts || []))
      .catch((e) => {
        // Ignore aborts — they mean a newer query took over.
        if (e?.name === "AbortError") return;
        const list = mockContacts.filter(
          (c) =>
            c.name.toLowerCase().includes((q || "").toLowerCase()) ||
            c.phoneNumber.includes(q || "")
        );
        setContacts(list);
      })
      .finally(() => {
        // Only the most recent request should clear the loading state.
        if (abortRef.current === controller) setLoading(false);
      });
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchContacts(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleAdd = async (name: string, phone: string) => {
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone_number: phone }),
    });
    // FIX: previously a failed POST faked the contact in local state, so it
    // looked added but was never saved and vanished on refresh (the reported
    // "not saving" bug — usually a duplicate phone number). Only refresh from
    // the server on success; otherwise show the real error.
    if (res.ok) {
      toast.success("Contact added");
      fetchContacts(search);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Failed to add contact");
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    // FIX: same masking problem on delete — only remove from the UI when the
    // server actually deleted it.
    if (res.ok) {
      toast.success("Contact deleted");
      fetchContacts(search);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Failed to delete contact");
    }
  };

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/contacts/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const added = typeof data.added === "number" ? data.added : undefined;
      const skipped = typeof data.skipped === "number" ? data.skipped : undefined;
      toast.success(
        added != null
          ? `Imported ${added} contact${added === 1 ? "" : "s"}${skipped ? `, ${skipped} skipped` : ""}`
          : "Contacts imported"
      );
      fetchContacts(search);
    } else {
      toast.error(data.error || "Failed to import contacts");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-black">Contacts</h2>
        <div className="flex items-center gap-2">
          <UploadCSVModal onUpload={handleUpload} />
          <AddContactModal onAdd={handleAdd} />
        </div>
      </div>

      <Input
        placeholder="Search contacts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm border-zinc-200 text-black placeholder:text-zinc-400 focus-visible:ring-black"
      />

      {loading ? <Skeleton className="h-64 rounded-lg" /> : <ContactsTable contacts={contacts} onDelete={handleDelete} />}
    </div>
  );
}
