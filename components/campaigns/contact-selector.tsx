"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Contact } from "@/lib/mock-data";

export function ContactSelector({
  contacts,
  selectedIds,
  onChange,
}: {
  contacts: Contact[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const allSelected = contacts.length > 0 && selectedIds.length === contacts.length;

  const toggleAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(contacts.map((c) => c.id));
    }
  };

  const toggleOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-200 hover:bg-transparent">
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                className="border-zinc-300 data-[state=checked]:bg-black data-[state=checked]:text-white"
              />
            </TableHead>
            <TableHead className="text-zinc-500">Name</TableHead>
            <TableHead className="text-zinc-500">Phone Number</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow key={contact.id} className="border-zinc-100">
              <TableCell>
                <Checkbox
                  checked={selectedIds.includes(contact.id)}
                  onCheckedChange={() => toggleOne(contact.id)}
                  className="border-zinc-300 data-[state=checked]:bg-black data-[state=checked]:text-white"
                />
              </TableCell>
              <TableCell className="text-sm font-medium text-black">{contact.name}</TableCell>
              <TableCell className="text-sm text-zinc-600">{contact.phoneNumber}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="border-t border-zinc-100 px-4 py-2 text-xs text-zinc-500">
        {selectedIds.length} of {contacts.length} selected
      </div>
    </div>
  );
}
