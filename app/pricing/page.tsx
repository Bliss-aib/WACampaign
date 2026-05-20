"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { MessageSquare, Calendar, ArrowRight, Check } from "lucide-react";

// ───────────────────────────────────────────────
// CONFIG: Replace this with your Calendly link
// ───────────────────────────────────────────────
const CALENDLY_EVENT_URL = "https://calendly.com/YOUR_LINK/30min"; // TODO: replace with your Calendly link

const MIN_MESSAGES = 1000;
const MAX_MESSAGES = 100000;
const STEP_MESSAGES = 1000;

// ───────────────────────────────────────────────

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export default function PricingPage() {
  const [messages, setMessages] = useState<number>(5000);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessages(Number(e.target.value));
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = "Name is required";
    if (!form.email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = "Enter a valid email";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleBookCall = () => {
    if (!validate()) return;

    const url = new URL(CALENDLY_EVENT_URL);
    url.searchParams.set("name", form.name.trim());
    url.searchParams.set("email", form.email.trim());
    // NOTE: If your Calendly event has custom questions in a different order,
    // adjust a1 / a2 / a3 below to match your question order.
    url.searchParams.set("a1", `${formatNumber(messages)} messages`);
    if (form.phone.trim()) url.searchParams.set("a2", form.phone.trim());
    if (form.company.trim()) url.searchParams.set("a3", form.company.trim());

    setSubmitted(true);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Simple top nav */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-black" />
            <span className="text-lg font-semibold tracking-tight text-black">WACampaign</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-black"
            >
              Home
            </Link>
            <Link
              href="/sign-in"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-black"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        {/* Hero text */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl">
            Get a custom quote
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-500">
            Tell us how many messages you need and book a quick call. We&apos;ll build a plan tailored to your business.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left: Volume selector */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Estimate your volume
              </CardTitle>
              <CardDescription>
                Drag the slider to match your monthly message needs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Slider */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-600">
                    {formatNumber(messages)} messages / month
                  </span>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                    Custom quote
                  </span>
                </div>
                <input
                  type="range"
                  min={MIN_MESSAGES}
                  max={MAX_MESSAGES}
                  step={STEP_MESSAGES}
                  value={messages}
                  onChange={handleSliderChange}
                  className="w-full accent-black"
                />
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>{formatNumber(MIN_MESSAGES)}</span>
                  <span>{formatNumber(MAX_MESSAGES)}</span>
                </div>
              </div>

              {/* Summary card */}
              <div className="rounded-xl bg-zinc-50 p-5 ring-1 ring-zinc-100">
                <div className="text-sm text-zinc-500">Selected volume</div>
                <div className="mt-1 text-3xl font-semibold text-black">
                  {formatNumber(messages)}
                </div>
                <div className="mt-1 text-xs text-zinc-400">
                  messages per month
                </div>
                <ul className="mt-4 space-y-2">
                  {[
                    "WhatsApp Business API access",
                    "Campaign management dashboard",
                    "Contact & template management",
                    "Delivery analytics",
                    "Priority support",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-zinc-600">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-900" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Right: Contact form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Book a call
              </CardTitle>
              <CardDescription>
                Fill in your details and we&apos;ll open Calendly with everything prefilled.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Full name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={handleInputChange("name")}
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-xs text-red-500">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Work email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@company.com"
                  value={form.email}
                  onChange={handleInputChange("email")}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={form.phone}
                  onChange={handleInputChange("phone")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company name</Label>
                <Input
                  id="company"
                  placeholder="Acme Inc."
                  value={form.company}
                  onChange={handleInputChange("company")}
                />
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <Button
                onClick={handleBookCall}
                className="w-full gap-2"
                size="lg"
              >
                Book a call
                <ArrowRight className="h-4 w-4" />
              </Button>
              {submitted && (
                <p className="text-center text-xs text-zinc-500">
                  Calendly opened in a new tab with your details prefilled.
                </p>
              )}
              <p className="text-center text-xs text-zinc-400">
                No credit card required. You&apos;ll receive a confirmation email after booking.
              </p>
            </CardFooter>
          </Card>
        </div>

        {/* Bottom note */}
        <div className="mt-16 text-center">
          <p className="text-sm text-zinc-400">
            Need a custom enterprise plan?{" "}
            <a
              href={`mailto:hello@wacampaign.com?subject=Enterprise%20Plan%20Inquiry&body=Hi%2C%0A%0AI%20need%20more%20than%20${formatNumber(MAX_MESSAGES)}%20messages%20per%20month.%20Can%20we%20discuss%20a%20custom%20plan%3F`}
              className="font-medium text-zinc-700 underline-offset-2 hover:text-black hover:underline"
            >
              Contact us
            </a>{" "}
            for volume pricing.
          </p>
        </div>
      </main>
    </div>
  );
}
