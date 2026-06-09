"use client";

import { useEffect, useState } from "react";
import { WhatsAppConnectionCard } from "@/components/settings/whatsapp-connection";
import { PlanInfoCard } from "@/components/settings/plan-info";
import { ProfileCard } from "@/components/settings/profile-card";
import { DangerZone } from "@/components/settings/danger-zone";
import { Skeleton } from "@/components/ui/skeleton";
import { mockBusiness } from "@/lib/mock-data";
import { toast } from "sonner";

export default function SettingsPage() {
  const [business, setBusiness] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    Promise.all([fetch("/api/business"), fetch("/api/usage")])
      .then(([r1, r2]) => Promise.all([r1.ok ? r1.json() : Promise.reject(), r2.ok ? r2.json() : Promise.reject()]))
      .then(([b, u]) => {
        setBusiness(b.business || null);
        setUsage(u || null);
      })
      .catch(() => {
        setBusiness(mockBusiness);
        setUsage({ used: mockBusiness.todayUsage, limit: mockBusiness.dailyLimit });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConnect = async (token: string, wabaId: string, phoneId: string) => {
    const res = await fetch("/api/business", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: token, waba_id: wabaId, phone_number_id: phoneId }),
    });
    // FIX (H7): previously the failure branch faked a "Connected" state with the
    // entered credentials, so a rejected/invalid connection still looked
    // successful. Surface the real error and leave the actual state untouched.
    if (res.ok) {
      toast.success("WhatsApp connected");
      fetchData();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Failed to connect WhatsApp");
    }
  };

  const handleDisconnect = async () => {
    const res = await fetch("/api/business", { method: "DELETE" });
    // FIX (H7): same problem on disconnect — don't fake success on failure.
    if (res.ok) {
      toast.success("WhatsApp disconnected");
      fetchData();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Failed to disconnect WhatsApp");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-black">Settings</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <WhatsAppConnectionCard
          business={{
            connectionStatus: business?.connection_status || business?.connectionStatus || "disconnected",
            wabaId: business?.waba_id || business?.wabaId || "",
            phoneNumberId: business?.phone_number_id || business?.phoneNumberId || "",
          }}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />
        <PlanInfoCard dailyLimit={usage?.limit || 250} todayUsage={usage?.used || 0} />
      </div>
      <ProfileCard />
      <DangerZone />
    </div>
  );
}
