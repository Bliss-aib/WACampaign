"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Send, Check, CheckCheck, Clock, AlertCircle } from "lucide-react";

interface MessageDeliveryPreviewProps {
  templateName: string;
  templateBody: string;
  templateImageUrls?: string[];
  contacts: { name: string; phoneNumber: string }[];
}

const SAMPLE_VALUES: Record<string, string> = {
  name: "{{name}}",
  firstname: "{{firstname}}",
  lastname: "{{lastname}}",
  business: "Acme Inc.",
  company: "Acme Inc.",
  date: "May 18, 2026",
  time: "2:30 PM",
  product: "Premium Plan",
  item: "Wireless Headphones",
  price: "$49.99",
  discount: "20%",
  code: "SAVE20",
  link: "https://example.com/shop",
  phone: "+1 (555) 000-0000",
  email: "john@example.com",
  location: "New York, NY",
  orderid: "#12345",
  status: "Shipped",
  collection: "Summer 2026",
  model: "Tesla Model 3",
  event: "Grand Opening",
  guests: "4",
  beds: "3",
  baths: "2",
  type: "Apartment",
  address: "123 Main St",
  doctor: "Dr. Smith",
  course: "Digital Marketing",
  subject: "Math",
  service: "Haircut",
  package: "Glow-Up",
  class: "Yoga",
  vehicle: "Toyota Camry",
  destination: "Bali",
  points: "500",
  meeting: "Q2 Review",
  agenda: "Sales & Growth",
  hours: "24",
};

function fillVariables(body: string, contactName: string): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const lower = key.toLowerCase();
    if (lower === "name") return contactName;
    if (lower === "firstname") return contactName.split(" ")[0] || contactName;
    if (lower === "lastname") return contactName.split(" ").slice(1).join(" ") || "Doe";
    return SAMPLE_VALUES[lower] || `{{${key}}}`;
  });
}

function ImageCarousel({ images }: { images: string[] }) {
  const [current, setCurrent] = useState(0);
  if (images.length === 0) return null;
  const prev = () => setCurrent((c) => (c === 0 ? images.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === images.length - 1 ? 0 : c + 1));

  return (
    <div className="relative w-full mb-1">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-zinc-100">
        <Image src={images[current]} alt="" fill className="object-cover" />
      </div>
      {images.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-0.5 text-white hover:bg-black/60">
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button onClick={next} className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-0.5 text-white hover:bg-black/60">
            <ChevronRight className="h-3 w-3" />
          </button>
          <div className="mt-1 flex justify-center gap-1">
            {images.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} className={`h-1 rounded-full transition-all ${i === current ? "w-3 bg-zinc-500" : "w-1.5 bg-zinc-300"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function MessageDeliveryPreview({
  templateName,
  templateBody,
  templateImageUrls,
  contacts,
}: MessageDeliveryPreviewProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "flow">("preview");
  const hasContacts = contacts.length > 0;
  const sampleContact = hasContacts ? contacts[0] : { name: "John Doe", phoneNumber: "+1 555-0000" };
  const filledBody = fillVariables(templateBody, sampleContact.name);
  const images = templateImageUrls || [];

  return (
    <Card className="border-zinc-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-black">How Your Message Will Be Sent</CardTitle>
          <div className="flex gap-1">
            <Button
              variant={activeTab === "preview" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("preview")}
              className={`text-xs h-7 ${activeTab === "preview" ? "bg-black text-white" : "border-zinc-200 text-black"}`}
            >
              Message Preview
            </Button>
            <Button
              variant={activeTab === "flow" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("flow")}
              className={`text-xs h-7 ${activeTab === "flow" ? "bg-black text-white" : "border-zinc-200 text-black"}`}
            >
              Delivery Flow
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activeTab === "preview" ? (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Phone preview */}
            <div className="flex justify-center">
              <div className="w-full max-w-[260px] rounded-[2rem] border-4 border-zinc-800 bg-zinc-900 p-2 shadow-xl">
                <div className="mx-auto mb-2 h-5 w-20 rounded-full bg-zinc-800" />
                <div className="rounded-[1.5rem] bg-[#e5ddd5] p-3">
                  <div className="mb-3 flex items-center gap-2 rounded-lg bg-[#f0f0f0] p-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-300 text-[10px] font-bold text-zinc-600">
                      {sampleContact.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-zinc-800">{sampleContact.name}</p>
                      <p className="text-[9px] text-zinc-500">{sampleContact.phoneNumber}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {images.length > 0 && <ImageCarousel images={images} />}
                    <div className="flex justify-start">
                      <div className="max-w-[90%] rounded-lg rounded-tl-none bg-white px-3 py-2 shadow-sm">
                        <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-zinc-800">
                          {filledBody}
                        </p>
                        <span className="mt-1 block text-right text-[9px] text-zinc-400">10:30 AM</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Explanation */}
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-black">Template</p>
                <p className="text-xs text-zinc-500">{templateName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-black">Personalization</p>
                <p className="text-xs text-zinc-500">
                  Each contact receives the message with their own data filled in.
                  Example: <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-700 font-mono text-[10px]">{"{{name}}"}</code> becomes{" "}
                  <span className="font-medium text-black">{sampleContact.name}</span>.
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-black">Recipients</p>
                <p className="text-xs text-zinc-500">
                  {hasContacts
                    ? `${contacts.length} contact${contacts.length > 1 ? "s" : ""} will receive this message.`
                    : "No contacts selected yet."}
                </p>
                {hasContacts && contacts.length > 1 && (
                  <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
                    {contacts.slice(0, 6).map((c, i) => (
                      <span key={i} className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600">
                        {c.name}
                      </span>
                    ))}
                    {contacts.length > 6 && (
                      <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600">
                        +{contacts.length - 6} more
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-100">
                <p className="text-xs font-medium text-black">Raw Message</p>
                <p className="mt-1 text-[11px] text-zinc-500 whitespace-pre-wrap">{templateBody}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Delivery flow timeline */}
            {[
              { icon: Clock, label: "Queued", desc: "Campaign is saved and scheduled in the queue" },
              { icon: Send, label: "Sending", desc: "Worker picks up the job and starts sending" },
              { icon: Check, label: "Sent", desc: "Meta's API confirms the message was dispatched" },
              { icon: CheckCheck, label: "Delivered", desc: "Contact's phone receives the message" },
              { icon: CheckCheck, label: "Read", desc: "Contact opens and reads the message" },
            ].map((step, i) => (
              <div key={step.label} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100">
                    <step.icon className="h-4 w-4 text-zinc-600" />
                  </div>
                  {i < 4 && <div className="h-6 w-px bg-zinc-200" />}
                </div>
                <div className="pb-2">
                  <p className="text-sm font-medium text-black">{step.label}</p>
                  <p className="text-xs text-zinc-500">{step.desc}</p>
                </div>
              </div>
            ))}

            <div className="rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-100 space-y-2">
              <p className="text-xs font-medium text-black">Technical Flow</p>
              <ol className="list-decimal list-inside text-[11px] text-zinc-500 space-y-1">
                <li>User creates campaign → <code className="font-mono text-zinc-700">POST /api/campaigns</code></li>
                <li>Campaign + contacts saved to Supabase</li>
                <li>BullMQ schedules the job for the chosen time</li>
                <li>Worker processes each contact individually</li>
                <li>Meta WhatsApp API called: <code className="font-mono text-zinc-700">graph.facebook.com/v18.0/.../messages</code></li>
                <li>Delivery & read receipts update via webhooks</li>
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
