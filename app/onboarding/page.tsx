"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Users, FileText, Rocket, Check, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

const steps = [
  { id: 1, label: "Connect WhatsApp", icon: MessageSquare },
  { id: 2, label: "Add contacts", icon: Users },
  { id: 3, label: "Create template", icon: FileText },
  { id: 4, label: "Ready to send", icon: Rocket },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ connected: false, contacts: 0, templates: 0 });

  // Step 1 state
  const [token, setToken] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [phoneId, setPhoneId] = useState("");
  const [connecting, setConnecting] = useState(false);

  // Step 2 state
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [addingContact, setAddingContact] = useState(false);

  // Step 3 state
  const [templateName, setTemplateName] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  // Step 4 state
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const [businessRes, contactsRes, templatesRes] = await Promise.all([
        fetch("/api/business"),
        fetch("/api/contacts"),
        fetch("/api/templates"),
      ]);

      const business = businessRes.ok ? await businessRes.json() : { business: null };
      const contacts = contactsRes.ok ? await contactsRes.json() : { contacts: [] };
      const templates = templatesRes.ok ? await templatesRes.json() : { templates: [] };

      const connected = business.business?.connection_status === "connected";
      const contactsCount = contacts.contacts?.length || 0;
      const templatesCount = templates.templates?.length || 0;

      setProgress({ connected, contacts: contactsCount, templates: templatesCount });

      // Auto-advance to the first incomplete step.
      if (connected && contactsCount > 0 && templatesCount > 0) {
        setStep(4);
      } else if (connected && contactsCount > 0) {
        setStep(3);
      } else if (connected) {
        setStep(2);
      } else {
        setStep(1);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!token.trim() || !wabaId.trim() || !phoneId.trim()) return;
    setConnecting(true);
    const res = await fetch("/api/business", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: token, waba_id: wabaId, phone_number_id: phoneId }),
    });
    setConnecting(false);

    if (res.ok) {
      toast.success("WhatsApp connected");
      setProgress((p) => ({ ...p, connected: true }));
      setStep(2);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Failed to connect WhatsApp");
    }
  };

  const handleAddContact = async () => {
    if (!contactName.trim() || !contactPhone.trim()) return;
    setAddingContact(true);
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: contactName, phone_number: contactPhone }),
    });
    setAddingContact(false);

    if (res.ok) {
      toast.success("Contact added");
      setContactName("");
      setContactPhone("");
      setProgress((p) => ({ ...p, contacts: p.contacts + 1 }));
      setStep(3);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Failed to add contact");
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateName.trim() || !templateBody.trim()) return;
    setCreatingTemplate(true);
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: templateName, body: templateBody }),
    });
    setCreatingTemplate(false);

    if (res.ok) {
      toast.success("Template created");
      setProgress((p) => ({ ...p, templates: p.templates + 1 }));
      setStep(4);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Failed to create template");
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    const res = await fetch("/api/onboarding/complete", { method: "POST" });
    setCompleting(false);

    if (res.ok) {
      toast.success("You're all set!");
      router.push("/dashboard");
    } else {
      toast.error("Failed to finish onboarding");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold text-black">Welcome to WACampaign</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Let's get your WhatsApp campaigns ready in 4 quick steps.
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-10">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isCompleted = step > s.id || (s.id === 4 && step === 4 && progress.templates > 0);
              return (
                <div key={s.id} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                        isActive
                          ? "border-black bg-black text-white"
                          : isCompleted
                            ? "border-black bg-black text-white"
                            : "border-zinc-300 bg-white text-zinc-400"
                      }`}
                    >
                      {isCompleted && !isActive ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium ${
                        isActive || isCompleted ? "text-black" : "text-zinc-400"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={`mx-2 h-0.5 flex-1 ${
                        step > s.id ? "bg-black" : "bg-zinc-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <Card className="border-zinc-200 bg-white">
          <CardHeader>
            <CardTitle className="text-lg text-black">{steps[step - 1].label}</CardTitle>
            <CardDescription className="text-zinc-500">
              {step === 1 && "Connect your WhatsApp Business API credentials."}
              {step === 2 && "Add at least one contact to send messages to."}
              {step === 3 && "Create your first message template."}
              {step === 4 && "You're ready to start sending campaigns."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-black">Access Token</Label>
                  <Input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter Meta access token"
                    className="border-zinc-200 text-black"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-black">WABA ID</Label>
                  <Input
                    value={wabaId}
                    onChange={(e) => setWabaId(e.target.value)}
                    placeholder="WhatsApp Business Account ID"
                    className="border-zinc-200 text-black"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-black">Phone Number ID</Label>
                  <Input
                    value={phoneId}
                    onChange={(e) => setPhoneId(e.target.value)}
                    placeholder="Phone Number ID"
                    className="border-zinc-200 text-black"
                  />
                </div>
                <Button
                  onClick={handleConnect}
                  disabled={!token.trim() || !wabaId.trim() || !phoneId.trim() || connecting}
                  className="bg-black text-white hover:bg-zinc-800 disabled:bg-zinc-200"
                >
                  {connecting ? "Connecting..." : "Connect WhatsApp"}
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-black">Contact Name</Label>
                    <Input
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="border-zinc-200 text-black"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-black">Phone Number</Label>
                    <Input
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="border-zinc-200 text-black"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAddContact}
                  disabled={!contactName.trim() || !contactPhone.trim() || addingContact}
                  className="bg-black text-white hover:bg-zinc-800 disabled:bg-zinc-200"
                >
                  {addingContact ? "Adding..." : "Add Contact"}
                </Button>
                <Separator className="bg-zinc-100" />
                <p className="text-xs text-zinc-500">
                  You can also import many contacts later from the Contacts page.
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-black">Template Name</Label>
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. Welcome Message"
                    className="border-zinc-200 text-black"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-black">Message Body</Label>
                  <textarea
                    value={templateBody}
                    onChange={(e) => setTemplateBody(e.target.value)}
                    placeholder="Hi {{name}}, welcome to our business!"
                    rows={4}
                    className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-black placeholder:text-zinc-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  <p className="text-xs text-zinc-500">
                    Use <code className="rounded bg-zinc-100 px-1">{"{{name}}"}</code> to personalize the message.
                  </p>
                </div>
                <Button
                  onClick={handleCreateTemplate}
                  disabled={!templateName.trim() || !templateBody.trim() || creatingTemplate}
                  className="bg-black text-white hover:bg-zinc-800 disabled:bg-zinc-200"
                >
                  {creatingTemplate ? "Creating..." : "Create Template"}
                </Button>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <h3 className="font-medium text-black">Setup summary</h3>
                  <ul className="mt-3 space-y-2 text-sm text-zinc-600">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-black" />
                      WhatsApp connected
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-black" />
                      {progress.contacts} contact{progress.contacts === 1 ? "" : "s"} added
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-black" />
                      {progress.templates} template{progress.templates === 1 ? "" : "s"} created
                    </li>
                  </ul>
                </div>
                <p className="text-sm text-zinc-500">
                  Note: Before sending campaigns, submit your template to Meta for approval from the Templates page.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    onClick={handleComplete}
                    disabled={completing}
                    className="bg-black text-white hover:bg-zinc-800 disabled:bg-zinc-200"
                  >
                    {completing ? "Finishing..." : "Go to Dashboard"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Link href="/campaigns/new">
                    <Button
                      variant="outline"
                      className="w-full border-zinc-200 text-black hover:bg-zinc-50"
                    >
                      Create First Campaign
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
