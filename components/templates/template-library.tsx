"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search,
  Check,
  ShoppingBag,
  Shirt,
  UtensilsCrossed,
  Home,
  HeartPulse,
  GraduationCap,
  Sparkles,
  Dumbbell,
  Car,
  CalendarDays,
  Laptop,
  Gem,
  Plane,
  Building2,
  Scissors,
  Baby,
  Camera,
  Music,
  TreePine,
  PartyPopper,
  Bus,
  Smartphone,
  Image as ImageIcon,
} from "lucide-react";
import Image from "next/image";

export interface ReadyTemplate {
  id: string;
  name: string;
  body: string;
  category: string;
  industry: string;
  variables: string[];
  gradient: string;
  icon: string;
  imageUrls?: string[];
}

const INDUSTRY_ICONS: Record<string, React.ElementType> = {
  clothing: Shirt,
  restaurant: UtensilsCrossed,
  realestate: Home,
  healthcare: HeartPulse,
  education: GraduationCap,
  beauty: Sparkles,
  fitness: Dumbbell,
  automotive: Car,
  events: CalendarDays,
  technology: Laptop,
  jewelry: Gem,
  travel: Plane,
  corporate: Building2,
  salon: Scissors,
  baby: Baby,
  photography: Camera,
  entertainment: Music,
  agriculture: TreePine,
  party: PartyPopper,
  logistics: Bus,
  telecom: Smartphone,
  ecommerce: ShoppingBag,
};

const GRADIENTS = [
  "from-rose-100 to-orange-100",
  "from-sky-100 to-indigo-100",
  "from-emerald-100 to-teal-100",
  "from-amber-100 to-yellow-100",
  "from-violet-100 to-purple-100",
  "from-pink-100 to-rose-100",
  "from-cyan-100 to-blue-100",
  "from-lime-100 to-green-100",
  "from-fuchsia-100 to-pink-100",
  "from-orange-100 to-red-100",
];

function getGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  const index = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[index];
}

const READY_TEMPLATES: ReadyTemplate[] = [
  // Clothing / Fashion
  {
    id: "rt-1",
    name: "New Collection Launch",
    body: "Hi {{name}}! ✨ Our new {{collection}} collection just dropped! Get early access + {{discount}} off for 48 hours. Shop now: {{link}}",
    category: "promotions",
    industry: "clothing",
    variables: ["name", "collection", "discount", "link"],
    gradient: getGradient("rt-1"),
    icon: "clothing",
  },
  {
    id: "rt-2",
    name: "Seasonal Sale",
    body: "Hey {{name}}! 🛍️ Our end-of-season sale is LIVE. Up to {{discount}} off on all items. Visit {{business}} today! {{link}}",
    category: "promotions",
    industry: "clothing",
    variables: ["name", "discount", "business", "link"],
    gradient: getGradient("rt-2"),
    icon: "clothing",
  },
  // Restaurant / Food
  {
    id: "rt-3",
    name: "Daily Specials",
    body: "Hungry {{name}}? 🍽️ Today's special at {{business}}: {{item}} for only {{price}}! Available until {{time}}. Order: {{link}}",
    category: "promotions",
    industry: "restaurant",
    variables: ["name", "business", "item", "price", "time", "link"],
    gradient: getGradient("rt-3"),
    icon: "restaurant",
  },
  {
    id: "rt-4",
    name: "Table Reservation",
    body: "Hi {{name}}, your table for {{guests}} at {{business}} is confirmed for {{date}} at {{time}}. See you soon! 🍷",
    category: "reminders",
    industry: "restaurant",
    variables: ["name", "guests", "business", "date", "time"],
    gradient: getGradient("rt-4"),
    icon: "restaurant",
  },
  // Real Estate
  {
    id: "rt-5",
    name: "Property Listing",
    body: "Hi {{name}}, check out this new {{type}} in {{location}}! {{beds}} beds, {{baths}} baths, priced at {{price}}. Schedule a viewing: {{link}}",
    category: "promotions",
    industry: "realestate",
    variables: ["name", "type", "location", "beds", "baths", "price", "link"],
    gradient: getGradient("rt-5"),
    icon: "realestate",
  },
  {
    id: "rt-6",
    name: "Open House Invite",
    body: "You're invited, {{name}}! 🏠 Open house at {{address}} this {{date}} from {{time}}. Don't miss it! RSVP: {{link}}",
    category: "events",
    industry: "realestate",
    variables: ["name", "address", "date", "time", "link"],
    gradient: getGradient("rt-6"),
    icon: "realestate",
  },
  // Healthcare
  {
    id: "rt-7",
    name: "Appointment Reminder",
    body: "Hi {{name}}, this is a reminder for your appointment with Dr. {{doctor}} at {{business}} on {{date}} at {{time}}. Reply CONFIRM to confirm.",
    category: "reminders",
    industry: "healthcare",
    variables: ["name", "doctor", "business", "date", "time"],
    gradient: getGradient("rt-7"),
    icon: "healthcare",
  },
  {
    id: "rt-8",
    name: "Health Checkup Offer",
    body: "Hello {{name}}, stay healthy! 🩺 Book a full body checkup at {{business}} for just {{price}}. Offer valid until {{date}}. {{link}}",
    category: "promotions",
    industry: "healthcare",
    variables: ["name", "business", "price", "date", "link"],
    gradient: getGradient("rt-8"),
    icon: "healthcare",
  },
  // Education
  {
    id: "rt-9",
    name: "Course Enrollment",
    body: "Hi {{name}}! 🎓 Enroll in our {{course}} starting {{date}}. Early bird fee: {{price}}. Secure your spot: {{link}}",
    category: "promotions",
    industry: "education",
    variables: ["name", "course", "date", "price", "link"],
    gradient: getGradient("rt-9"),
    icon: "education",
  },
  {
    id: "rt-10",
    name: "Class Reminder",
    body: "Reminder {{name}}: Your {{subject}} class starts at {{time}} today. Location: {{location}}. See you there! 📚",
    category: "reminders",
    industry: "education",
    variables: ["name", "subject", "time", "location"],
    gradient: getGradient("rt-10"),
    icon: "education",
  },
  // Beauty / Salon
  {
    id: "rt-11",
    name: "Salon Booking",
    body: "Hi {{name}}! 💇‍♀️ Your appointment at {{business}} is confirmed for {{date}} at {{time}}. Service: {{service}}. See you then!",
    category: "reminders",
    industry: "salon",
    variables: ["name", "business", "date", "time", "service"],
    gradient: getGradient("rt-11"),
    icon: "salon",
  },
  {
    id: "rt-12",
    name: "Beauty Package Deal",
    body: "Glow up {{name}}! ✨ Our {{package}} package is now {{discount}} off. Valid till {{date}}. Book now: {{link}}",
    category: "promotions",
    industry: "salon",
    variables: ["name", "package", "discount", "date", "link"],
    gradient: getGradient("rt-12"),
    icon: "salon",
  },
  // Fitness
  {
    id: "rt-13",
    name: "Membership Offer",
    body: "Hey {{name}}! 💪 Join {{business}} today and get {{discount}} off your first month. Transform your fitness journey: {{link}}",
    category: "promotions",
    industry: "fitness",
    variables: ["name", "business", "discount", "link"],
    gradient: getGradient("rt-13"),
    icon: "fitness",
  },
  {
    id: "rt-14",
    name: "Class Schedule",
    body: "Hi {{name}}, your {{class}} class is scheduled for {{date}} at {{time}}. Don't forget your water bottle! 🏋️",
    category: "reminders",
    industry: "fitness",
    variables: ["name", "class", "date", "time"],
    gradient: getGradient("rt-14"),
    icon: "fitness",
  },
  // Automotive
  {
    id: "rt-15",
    name: "Service Reminder",
    body: "Hi {{name}}, your {{vehicle}} is due for service at {{business}}. Book your slot: {{link}} or call {{phone}}.",
    category: "reminders",
    industry: "automotive",
    variables: ["name", "vehicle", "business", "link", "phone"],
    gradient: getGradient("rt-15"),
    icon: "automotive",
  },
  {
    id: "rt-16",
    name: "New Arrival Alert",
    body: "Hey {{name}}! 🚗 The new {{model}} has arrived at {{business}}. Book a test drive: {{link}}",
    category: "promotions",
    industry: "automotive",
    variables: ["name", "model", "business", "link"],
    gradient: getGradient("rt-16"),
    icon: "automotive",
  },
  // Events
  {
    id: "rt-17",
    name: "Event Invitation",
    body: "You're invited {{name}}! 🎉 Join us for {{event}} on {{date}} at {{location}}. RSVP here: {{link}}",
    category: "events",
    industry: "events",
    variables: ["name", "event", "date", "location", "link"],
    gradient: getGradient("rt-17"),
    icon: "events",
  },
  // Technology
  {
    id: "rt-18",
    name: "Product Launch",
    body: "Hi {{name}}! 📱 {{product}} is now live. Be among the first to experience it. Order now: {{link}}",
    category: "promotions",
    industry: "technology",
    variables: ["name", "product", "link"],
    gradient: getGradient("rt-18"),
    icon: "technology",
  },
  // E-commerce (general)
  {
    id: "rt-19",
    name: "Welcome Message",
    body: "Hi {{name}}! 🎉 Welcome to {{business}}. Enjoy {{discount}} off your first order with code {{code}}. Start shopping: {{link}}",
    category: "promotions",
    industry: "ecommerce",
    variables: ["name", "business", "discount", "code", "link"],
    gradient: getGradient("rt-19"),
    icon: "ecommerce",
  },
  {
    id: "rt-20",
    name: "Abandoned Cart",
    body: "Hey {{name}}, you left {{item}} in your cart! 🛒 Complete your order now and save {{discount}} with code {{code}}. {{link}}",
    category: "promotions",
    industry: "ecommerce",
    variables: ["name", "item", "discount", "code", "link"],
    gradient: getGradient("rt-20"),
    icon: "ecommerce",
  },
  // Travel
  {
    id: "rt-21",
    name: "Trip Offer",
    body: "Hi {{name}}! ✈️ Explore {{destination}} with our exclusive package starting at {{price}}. Book by {{date}}: {{link}}",
    category: "promotions",
    industry: "travel",
    variables: ["name", "destination", "price", "date", "link"],
    gradient: getGradient("rt-21"),
    icon: "travel",
  },
  // Corporate
  {
    id: "rt-22",
    name: "Meeting Reminder",
    body: "Hi {{name}}, reminder: {{meeting}} on {{date}} at {{time}}. Location: {{location}}. Agenda attached.",
    category: "reminders",
    industry: "corporate",
    variables: ["name", "meeting", "date", "time", "location"],
    gradient: getGradient("rt-22"),
    icon: "corporate",
  },
  // Photography
  {
    id: "rt-23",
    name: "Shoot Booking",
    body: "Hi {{name}}! 📸 Your {{type}} shoot is confirmed for {{date}} at {{time}}. Location: {{location}}. Excited to work with you!",
    category: "reminders",
    industry: "photography",
    variables: ["name", "type", "date", "time", "location"],
    gradient: getGradient("rt-23"),
    icon: "photography",
  },
  // Jewelry
  {
    id: "rt-24",
    name: "Valentine Special",
    body: "Hi {{name}}! 💎 Surprise your loved one with our exclusive {{collection}}. Flat {{discount}} off till {{date}}. {{link}}",
    category: "promotions",
    industry: "jewelry",
    variables: ["name", "collection", "discount", "date", "link"],
    gradient: getGradient("rt-24"),
    icon: "jewelry",
  },
  // Image templates
  {
    id: "rt-25",
    name: "Product Showcase",
    body: "Hi {{name}}! Check out our bestselling {{item}} — now only {{price}}. Limited stock available! Shop now: {{link}}",
    category: "promotions",
    industry: "clothing",
    variables: ["name", "item", "price", "link"],
    gradient: getGradient("rt-25"),
    icon: "clothing",
    imageUrls: ["https://picsum.photos/seed/fashion1/400/250"],
  },
  {
    id: "rt-26",
    name: "Lookbook Drop",
    body: "{{name}}, our new {{collection}} lookbook is here! 👗 Swipe through the latest styles and find your perfect fit. {{link}}",
    category: "promotions",
    industry: "clothing",
    variables: ["name", "collection", "link"],
    gradient: getGradient("rt-26"),
    icon: "clothing",
    imageUrls: ["https://picsum.photos/seed/fashion2/400/250"],
  },
  {
    id: "rt-27",
    name: "Menu Feature",
    body: "Hey {{name}}! 🍕 Our chef's special {{item}} is trending this week. Only {{price}} — order before {{time}}! {{link}}",
    category: "promotions",
    industry: "restaurant",
    variables: ["name", "item", "price", "time", "link"],
    gradient: getGradient("rt-27"),
    icon: "restaurant",
    imageUrls: ["https://picsum.photos/seed/food1/400/250"],
  },
  {
    id: "rt-28",
    name: "Property Tour",
    body: "Hi {{name}}, take a virtual tour of this beautiful {{type}} in {{location}}. Price: {{price}}. Schedule now: {{link}}",
    category: "promotions",
    industry: "realestate",
    variables: ["name", "type", "location", "price", "link"],
    gradient: getGradient("rt-28"),
    icon: "realestate",
    imageUrls: ["https://picsum.photos/seed/house1/400/250"],
  },
  {
    id: "rt-29",
    name: "Before & After",
    body: "Amazing transformation, {{name}}! ✨ See the results for yourself. Book your session at {{business}}: {{link}}",
    category: "promotions",
    industry: "salon",
    variables: ["name", "business", "link"],
    gradient: getGradient("rt-29"),
    icon: "salon",
    imageUrls: ["https://picsum.photos/seed/beauty1/400/250"],
  },
  {
    id: "rt-30",
    name: "Event Flyer",
    body: "You're invited {{name}}! 🎉 {{event}} at {{location}} on {{date}}. Don't miss out — RSVP: {{link}}",
    category: "events",
    industry: "events",
    variables: ["name", "event", "location", "date", "link"],
    gradient: getGradient("rt-30"),
    icon: "events",
    imageUrls: [
      "https://picsum.photos/seed/event1/400/250",
      "https://picsum.photos/seed/event2/400/250",
      "https://picsum.photos/seed/event3/400/250",
      "https://picsum.photos/seed/event4/400/250",
    ],
  },
];

const ALL_INDUSTRIES = Array.from(
  new Set(READY_TEMPLATES.map((t) => t.industry))
).sort();

interface TemplateLibraryProps {
  onUse: (template: ReadyTemplate) => void;
}

export function TemplateLibrary({ onUse }: TemplateLibraryProps) {
  const [search, setSearch] = useState("");
  const [activeIndustry, setActiveIndustry] = useState<string | null>(null);
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return READY_TEMPLATES.filter((t) => {
      const matchesSearch =
        !term ||
        t.name.toLowerCase().includes(term) ||
        t.industry.toLowerCase().includes(term) ||
        t.body.toLowerCase().includes(term);
      const matchesIndustry = !activeIndustry || t.industry === activeIndustry;
      return matchesSearch && matchesIndustry;
    });
  }, [search, activeIndustry]);

  const handleUse = (template: ReadyTemplate) => {
    onUse(template);
    setUsedIds((prev) => new Set(prev).add(template.id));
    toast.success(`"${template.name}" loaded into editor`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-black">Template Library</h2>
          <p className="text-sm text-zinc-500">
            {READY_TEMPLATES.length} ready-to-use templates across {ALL_INDUSTRIES.length} industries
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search by industry or template..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-zinc-200 text-black focus-visible:ring-black"
          />
        </div>
      </div>

      {/* Industry chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveIndustry(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !activeIndustry
              ? "bg-black text-white"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          }`}
        >
          All
        </button>
        {ALL_INDUSTRIES.map((ind) => {
          const Icon = INDUSTRY_ICONS[ind] || ShoppingBag;
          const isActive = activeIndustry === ind;
          return (
            <button
              key={ind}
              onClick={() => setActiveIndustry(isActive ? null : ind)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize ${
                isActive
                  ? "bg-black text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              <Icon className="h-3 w-3" />
              {ind}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-zinc-200 bg-white">
          <p className="text-sm text-zinc-400">No templates match your search.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((template) => {
            const Icon = INDUSTRY_ICONS[template.icon] || ShoppingBag;
            const isUsed = usedIds.has(template.id);
            return (
              <div
                key={template.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-md"
              >
                {/* Image area */}
                <div
                  className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${template.gradient} overflow-hidden`}
                >
                  {template.imageUrls && template.imageUrls.length > 0 ? (
                    <>
                      {template.imageUrls.length === 1 ? (
                        <Image
                          src={template.imageUrls[0]}
                          alt={template.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full grid-cols-2 gap-0.5">
                          {template.imageUrls.slice(0, 4).map((url, i) => (
                            <div key={i} className="relative bg-zinc-200 overflow-hidden">
                              <Image src={url} alt="" fill className="object-cover" />
                              {i === 3 && template.imageUrls!.length > 4 && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                  <span className="text-sm font-bold text-white">+{template.imageUrls!.length - 4}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Badge className="bg-black/60 text-white text-[10px] backdrop-blur-sm border-0">
                          <ImageIcon className="mr-0.5 h-3 w-3" />
                          {template.imageUrls.length} image{template.imageUrls.length > 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </>
                  ) : (
                    <Icon className="h-12 w-12 text-zinc-700/40" strokeWidth={1.2} />
                  )}
                  {(!template.imageUrls || template.imageUrls.length === 0) && (
                    <Badge
                      className="absolute top-2 right-2 bg-white/80 text-zinc-700 capitalize text-[10px] backdrop-blur-sm"
                      variant="secondary"
                    >
                      {template.industry}
                    </Badge>
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-black line-clamp-1">
                      {template.name}
                    </h3>
                    {isUsed && (
                      <Badge
                        variant="secondary"
                        className="shrink-0 bg-zinc-100 text-zinc-600 text-[10px]"
                      >
                        <Check className="mr-0.5 h-3 w-3" />
                        Added
                      </Badge>
                    )}
                  </div>

                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-zinc-500">
                    {template.body}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {template.variables.slice(0, 4).map((v) => (
                      <span
                        key={v}
                        className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500"
                      >
                        {"{"}
                        {"{" + v + "}"}
                        {"}"}
                      </span>
                    ))}
                    {template.variables.length > 4 && (
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-400">
                        +{template.variables.length - 4}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto pt-4">
                    <Button
                      onClick={() => handleUse(template)}
                      variant="outline"
                      className="w-full text-xs border-zinc-200 text-black hover:bg-zinc-50"
                      size="sm"
                    >
                      {isUsed ? "Use Again" : "Use This Template"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
