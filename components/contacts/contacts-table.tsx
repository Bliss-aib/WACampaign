"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Contact } from "@/lib/mock-data";
import { Trash2 } from "lucide-react";

export function ContactsTable({
  contacts,
  onDelete,
}: {
  contacts: Contact[];
  onDelete: (id: string) => void;
}) {
  if (contacts.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-zinc-200 bg-white">
        <p className="text-sm text-zinc-400">No contacts found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-200 hover:bg-transparent">
            <TableHead className="text-zinc-500">Name</TableHead>
            <TableHead className="text-zinc-500">Phone Number</TableHead>
            <TableHead className="text-zinc-500">Added</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow key={contact.id} className="border-zinc-100">
              <TableCell className="text-sm font-medium text-black">{contact.name}</TableCell>
              <TableCell className="text-sm text-zinc-600">{contact.phoneNumber}</TableCell>
              <TableCell className="text-sm text-zinc-400">
                {new Date(contact.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(contact.id)}
                  className="h-8 w-8 text-zinc-400 hover:text-black"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
