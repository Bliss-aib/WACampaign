"use client";

// FEATURE (Delete account): "Danger Zone" card — permanently deletes the
// account and all its data (contacts, templates, campaigns, chats), deletes the
// user's templates from Meta, and removes the login. Requires typing DELETE to
// confirm, then signs out and returns to the sign-in page.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function DangerZone() {
  const router = useRouter();
  const { signOut } = useClerk();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== "DELETE" || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to delete account");
        setDeleting(false);
        return;
      }
      toast.success("Account deleted");
      // Sign out (clears the Clerk session) then return to sign-in.
      try {
        await signOut();
      } catch {
        /* ignore — account is already deleted server-side */
      }
      router.push("/sign-in");
    } catch {
      toast.error("Failed to delete account");
      setDeleting(false);
    }
  };

  return (
    <Card className="border-red-200 bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-4 w-4" />
          Danger Zone
        </CardTitle>
        <CardDescription className="text-zinc-500">
          Permanently delete your account and all associated data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">This will permanently:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-red-600">
            <li>Delete all contacts, templates, campaigns, and chat history</li>
            <li>Delete your message templates from Meta (WhatsApp)</li>
            <li>Remove your stored WhatsApp connection &amp; access token</li>
            <li>Delete your login — this cannot be undone</li>
          </ul>
          <p className="mt-2 text-xs text-red-500">
            Note: fully revoking the WhatsApp API token must be done in the Meta App
            dashboard (System Users → revoke/regenerate).
          </p>
        </div>

        {!confirming ? (
          <Button
            variant="outline"
            onClick={() => setConfirming(true)}
            className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete Account
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-600">
                Type <span className="font-mono font-semibold text-red-700">DELETE</span> to confirm
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                disabled={deleting}
                className="border-zinc-200 text-black focus-visible:ring-red-500"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setConfirming(false);
                  setConfirmText("");
                }}
                disabled={deleting}
                className="border-zinc-200 text-black hover:bg-zinc-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={confirmText !== "DELETE" || deleting}
                className="gap-1.5 bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? "Deleting..." : "Permanently delete account"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
