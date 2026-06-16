"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Copy } from "lucide-react";
import { toast } from "sonner";

function maskValue(value: string) {
  if (!value || value.length <= 4) return value;
  return `xxxx${value.slice(-4)}`;
}

function CopyableId({ label, value }: { label: string; value: string }) {
  const [show, setShow] = useState(false);
  const [showCopy, setShowCopy] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-500">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowCopy(true)}
          className="font-mono text-black hover:underline"
          title="Click to reveal copy option"
        >
          {show ? value : maskValue(value)}
        </button>
        {showCopy && (
          <Button
            size="icon"
            variant="ghost"
            onClick={handleCopy}
            className="h-6 w-6 text-zinc-500 hover:text-black"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            setShow((s) => !s);
            setShowCopy(false);
          }}
          className="h-6 w-6 text-zinc-500 hover:text-black"
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}

export function WhatsAppConnectionCard({
  business,
  onConnect,
  onDisconnect,
}: {
  business: {
    connectionStatus: "connected" | "disconnected";
    wabaId: string;
    phoneNumberId: string;
  };
  onConnect: (token: string, wabaId: string, phoneId: string) => void;
  onDisconnect: () => void;
}) {
  const [isEditing, setIsEditing] = useState(business.connectionStatus !== "connected");
  const [token, setToken] = useState("");
  const [wabaId, setWabaId] = useState(business.wabaId || "");
  const [phoneId, setPhoneId] = useState(business.phoneNumberId || "");

  const handleConnect = () => {
    if (!token.trim() || !wabaId.trim() || !phoneId.trim()) return;
    onConnect(token, wabaId, phoneId);
    setIsEditing(false);
    setToken("");
  };

  return (
    <Card className="border-zinc-200">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-black">WhatsApp Connection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {business.connectionStatus === "connected" && !isEditing ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-black" />
              <span className="text-sm font-medium text-black">Connected</span>
            </div>
            <div className="space-y-2 text-sm">
              <CopyableId label="WABA ID" value={business.wabaId} />
              <CopyableId label="Phone Number ID" value={business.phoneNumberId} />
            </div>
            <Separator className="bg-zinc-100" />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="border-zinc-200 text-black hover:bg-zinc-50"
              >
                Update
              </Button>
              <Button
                variant="outline"
                onClick={onDisconnect}
                className="border-zinc-200 text-black hover:bg-zinc-50"
              >
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-black">Access Token</Label>
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter Meta access token"
                className="border-zinc-200 text-black focus-visible:ring-black"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-black">WABA ID</Label>
              <Input
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                placeholder="WhatsApp Business Account ID"
                className="border-zinc-200 text-black focus-visible:ring-black"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-black">Phone Number ID</Label>
              <Input
                value={phoneId}
                onChange={(e) => setPhoneId(e.target.value)}
                placeholder="Phone Number ID"
                className="border-zinc-200 text-black focus-visible:ring-black"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleConnect}
                disabled={!token.trim() || !wabaId.trim() || !phoneId.trim()}
                className="bg-black text-white hover:bg-zinc-800 disabled:bg-zinc-200"
              >
                Connect
              </Button>
              {business.connectionStatus === "connected" && (
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="border-zinc-200 text-black hover:bg-zinc-50"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
