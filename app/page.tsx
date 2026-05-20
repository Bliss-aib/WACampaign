import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  ArrowRight,
  Users,
  Megaphone,
  BarChart3,
  MessageCircle,
  Zap,
  Shield,
  Globe,
  Check,
} from "lucide-react";
import { Typewriter } from "@/components/typewriter";
import { WhatsAppLiveSend } from "@/components/whatsapp-live-send";

const steps = [
  {
    icon: Users,
    title: "Import your contacts",
    description:
      "Upload a CSV or add contacts one by one. Organize them into lists for targeted campaigns.",
  },
  {
    icon: MessageSquare,
    title: "Create message templates",
    description:
      "Build rich WhatsApp templates with variables, images, and carousels. Use AI to generate copy in seconds.",
  },
  {
    icon: Megaphone,
    title: "Launch campaigns",
    description:
      "Schedule or send campaigns instantly. Our queue handles delivery at scale with rate-limiting built in.",
  },
  {
    icon: BarChart3,
    title: "Track & reply",
    description:
      "Monitor delivery, open, and response rates in real time. Chat with customers directly from the inbox.",
  },
];

const features = [
  {
    icon: Zap,
    title: "Blazing fast delivery",
    description:
      "Powered by the WhatsApp Business API with intelligent queueing and batch sending.",
  },
  {
    icon: MessageCircle,
    title: "Two-way messaging",
    description:
      "Receive replies in real time. Manage conversations without leaving the dashboard.",
  },
  {
    icon: Shield,
    title: "Enterprise-grade security",
    description:
      "End-to-end encryption, secure API keys, and role-based access for your team.",
  },
  {
    icon: Globe,
    title: "Global reach",
    description:
      "Send to any country WhatsApp supports. Local number formatting handled automatically.",
  },
  {
    icon: Megaphone,
    title: "Campaign analytics",
    description:
      "Track sent, delivered, read, and failed metrics per campaign. Export reports anytime.",
  },
  {
    icon: MessageSquare,
    title: "Template library",
    description:
      "Start with 24+ pre-built industry templates. Customize them with drag-and-drop images and variables.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Top nav */}
      <header className="border-b border-zinc-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-black" />
            <span className="text-lg font-semibold tracking-tight text-black">
              WACampaign
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/pricing"
              className="text-sm font-medium text-zinc-500 transition-colors hover:text-black"
            >
              Pricing
            </Link>
            <Link
              href="/sign-in"
              className="text-sm font-medium text-zinc-500 transition-colors hover:text-black"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-zinc-100/60 blur-3xl" />
          <div className="absolute -left-20 top-40 h-72 w-72 rounded-full bg-zinc-50 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-28 sm:py-36">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left: text */}
            <div>
              <h1 className="animate-fade-in-up text-4xl font-semibold tracking-tight text-black sm:text-5xl">
                WhatsApp campaigns
                <br />
                that actually{" "}
                <Typewriter
                  words={["convert", "promote", "reply", "engage", "sell"]}
                  typingSpeed={100}
                  deletingSpeed={60}
                  pauseDuration={1800}
                />
              </h1>
              <p className="animate-fade-in-up delay-200 mt-6 text-lg text-zinc-500">
                Send personalized messages at scale, manage replies in one inbox,
                and track every delivery — all from a single dashboard built for
                modern marketers.
              </p>
              <div className="animate-fade-in-up delay-400 mt-10 flex flex-col gap-4 sm:flex-row">
                <Button
                  asChild
                  className="gap-2 bg-black text-white hover:bg-zinc-800 transition-all hover:shadow-lg hover:shadow-zinc-200"
                  size="lg"
                >
                  <Link href="/pricing">
                    Get a custom quote
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-zinc-200 text-black hover:bg-zinc-50"
                  size="lg"
                >
                  <Link href="/sign-in">Sign in to dashboard</Link>
                </Button>
              </div>
            </div>

            {/* Right: phone mockup */}
            <div className="animate-fade-in-up delay-600 flex justify-center lg:pl-8">
              <div className="relative h-[420px] w-[260px] rounded-[2.5rem] border-[6px] border-zinc-900 bg-zinc-900 shadow-2xl shadow-zinc-300">
                {/* Notch */}
                <div className="absolute left-1/2 top-0 z-10 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-zinc-900" />
                {/* Screen */}
                <WhatsAppLiveSend />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-zinc-100 bg-zinc-50/50">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-16 text-center">
            <h2 className="animate-fade-in-up text-3xl font-semibold tracking-tight text-black">
              How it works
            </h2>
            <p className="animate-fade-in-up delay-100 mx-auto mt-4 max-w-lg text-zinc-500">
              From first contact to campaign analytics in four simple steps.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="animate-fade-in-up group rounded-2xl bg-white p-6 ring-1 ring-zinc-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-zinc-100"
                style={{ animationDelay: `${200 + i * 100}ms` }}
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 transition-colors group-hover:bg-black">
                  <step.icon className="h-5 w-5 text-black transition-colors group-hover:text-white" />
                </div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Step {i + 1}
                </div>
                <h3 className="text-base font-semibold text-black">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-16 text-center">
          <h2 className="animate-fade-in-up text-3xl font-semibold tracking-tight text-black">
            Everything you need to scale
          </h2>
          <p className="animate-fade-in-up delay-100 mx-auto mt-4 max-w-lg text-zinc-500">
            No scattered tools. No manual spreadsheets. Just one powerful
            platform.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="animate-fade-in-up group rounded-2xl bg-zinc-50 p-6 ring-1 ring-zinc-100 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-lg hover:shadow-zinc-100"
              style={{ animationDelay: `${200 + i * 100}ms` }}
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white ring-1 ring-zinc-100 transition-colors group-hover:bg-black group-hover:ring-black">
                <f.icon className="h-5 w-5 text-black transition-colors group-hover:text-white" />
              </div>
              <h3 className="text-base font-semibold text-black">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="border-t border-zinc-100 bg-zinc-50/50">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="animate-fade-in-up text-3xl font-semibold tracking-tight text-black">
              Built for teams that move fast
            </h2>
            <ul className="animate-fade-in-up delay-200 mx-auto mt-8 inline-block text-left">
              {[
                "No-code template builder with live preview",
                "AI-powered message generation",
                "Real-time delivery & read receipts",
                "CSV import & contact segmentation",
                "Webhook support for custom integrations",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 py-2 text-zinc-600"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-black" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h2 className="animate-fade-in-up text-3xl font-semibold tracking-tight text-black">
          Ready to reach your customers where they are?
        </h2>
        <p className="animate-fade-in-up delay-100 mx-auto mt-4 max-w-lg text-zinc-500">
          Tell us how many messages you send and we&apos;ll build a plan
          tailored to your business. No credit card required.
        </p>
        <div className="animate-fade-in-up delay-200 mt-10">
          <Button
            asChild
            className="gap-2 bg-black text-white hover:bg-zinc-800 transition-all hover:shadow-lg hover:shadow-zinc-200"
            size="lg"
          >
            <Link href="/pricing">
              Get a custom quote
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-400">
              WACampaign
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            &copy; {new Date().getFullYear()} WACampaign. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
