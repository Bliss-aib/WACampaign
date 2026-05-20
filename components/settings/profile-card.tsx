"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { User, Mail, Building2, Phone, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "wacampaign-profile";

function getStoredProfile() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function saveProfile(profile: { name: string; email: string; company: string; phone: string }) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function ProfileCard() {
  const stored = getStoredProfile();
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState({
    name: stored?.name || "",
    email: stored?.email || "",
    company: stored?.company || "",
    phone: stored?.phone || "",
  });
  const [draft, setDraft] = useState(profile);

  const handleSave = () => {
    setProfile(draft);
    saveProfile(draft);
    setEditMode(false);
    toast.success("Profile updated");
  };

  const handleCancel = () => {
    setDraft(profile);
    setEditMode(false);
  };

  const initials = profile.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "—";

  return (
    <Card className="border-zinc-200 bg-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-black">Profile</CardTitle>
          <CardDescription className="text-zinc-500">
            Your personal information
          </CardDescription>
        </div>
        {!editMode ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditMode(true)}
            className="gap-1.5 border-zinc-200 text-black hover:bg-zinc-50"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="gap-1.5 border-zinc-200 text-black hover:bg-zinc-50"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="gap-1.5 bg-black text-white hover:bg-zinc-800"
            >
              <Check className="h-3.5 w-3.5" />
              Save
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-lg font-semibold text-zinc-700">
            {initials}
          </div>
          <div>
            <p className="text-sm font-medium text-black">
              {profile.name || "Your Name"}
            </p>
            <p className="text-xs text-zinc-500">
              {profile.email || "No email set"}
            </p>
          </div>
        </div>

        {/* Fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-medium text-zinc-600">
              <User className="h-3.5 w-3.5" />
              Full name
            </Label>
            {editMode ? (
              <Input
                value={draft.name}
                onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                placeholder="John Doe"
                className="border-zinc-200 text-black focus-visible:ring-black"
              />
            ) : (
              <div className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-black">
                {profile.name || "—"}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-medium text-zinc-600">
              <Mail className="h-3.5 w-3.5" />
              Email
            </Label>
            {editMode ? (
              <Input
                value={draft.email}
                onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
                placeholder="john@company.com"
                className="border-zinc-200 text-black focus-visible:ring-black"
              />
            ) : (
              <div className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-black">
                {profile.email || "—"}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-medium text-zinc-600">
              <Building2 className="h-3.5 w-3.5" />
              Company
            </Label>
            {editMode ? (
              <Input
                value={draft.company}
                onChange={(e) => setDraft((p) => ({ ...p, company: e.target.value }))}
                placeholder="Acme Inc."
                className="border-zinc-200 text-black focus-visible:ring-black"
              />
            ) : (
              <div className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-black">
                {profile.company || "—"}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-medium text-zinc-600">
              <Phone className="h-3.5 w-3.5" />
              Phone
            </Label>
            {editMode ? (
              <Input
                value={draft.phone}
                onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+1 415 555 1234"
                className="border-zinc-200 text-black focus-visible:ring-black"
              />
            ) : (
              <div className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-black">
                {profile.phone || "—"}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
