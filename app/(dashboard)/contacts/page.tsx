"use client";

import { useEffect, useState } from "react";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { AddContactModal } from "@/components/contacts/add-contact-modal";
import { UploadCSVModal } from "@/components/contacts/upload-csv-modal";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { mockContacts } from "@/lib/mock-data";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchContacts = (q?: string) => {
    setLoading(true);
    const url = q ? `/api/contacts?q=${encodeURIComponent(q)}` : "/api/contacts";
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setContacts(d.contacts || []))
      .catch(() => {
        const list = mockContacts.filter(
          (c) =>
            c.name.toLowerCase().includes((q || "").toLowerCase()) ||
            c.phoneNumber.includes(q || "")
        );
        setContacts(list);
      })
      .finally(() => setLoading(false));
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
    if (res.ok) fetchContacts(search);
    else {
      const newContact = {
        id: Math.random().toString(36).slice(2),
        name,
        phoneNumber: phone,
        createdAt: new Date().toISOString(),
      };
      setContacts((prev) => [newContact, ...prev]);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (res.ok) fetchContacts(search);
    else setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/contacts/upload", {
      method: "POST",
      body: formData,
    });
    if (res.ok) fetchContacts(search);
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
