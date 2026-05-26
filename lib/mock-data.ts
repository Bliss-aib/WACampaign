export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "completed"
  | "cancelled"
  | "failed";

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  scheduledAt: string | null;
  totalContacts: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  templateName: string;
  createdAt: string;
}

export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  createdAt: string;
}

// Meta Template Management status lifecycle (see migration 005_template_status.sql).
export type TemplateStatus = "local" | "pending" | "approved" | "rejected" | "paused" | "disabled";

export interface Template {
  id: string;
  name: string;
  body: string;
  variables: string[];
  imageUrls?: string[];
  createdAt: string;
  // FEATURE: Meta Template Management fields (optional so mock data still type-checks).
  status?: TemplateStatus;
  rejection_reason?: string;
  meta_template_name?: string;
}

export const mockCampaigns: Campaign[] = [
  {
    id: "1",
    name: "Summer Sale Blast",
    status: "completed",
    scheduledAt: "2026-05-10T09:00:00Z",
    totalContacts: 120,
    sentCount: 120,
    deliveredCount: 115,
    readCount: 98,
    failedCount: 5,
    templateName: "Promo Template",
    createdAt: "2026-05-09T10:00:00Z",
  },
  {
    id: "2",
    name: "New Arrival Alert",
    status: "sending",
    scheduledAt: "2026-05-12T08:00:00Z",
    totalContacts: 200,
    sentCount: 85,
    deliveredCount: 80,
    readCount: 60,
    failedCount: 5,
    templateName: "Announcement",
    createdAt: "2026-05-11T14:00:00Z",
  },
  {
    id: "3",
    name: "Weekly Newsletter",
    status: "scheduled",
    scheduledAt: "2026-05-15T10:00:00Z",
    totalContacts: 150,
    sentCount: 0,
    deliveredCount: 0,
    readCount: 0,
    failedCount: 0,
    templateName: "Newsletter",
    createdAt: "2026-05-12T11:00:00Z",
  },
  {
    id: "4",
    name: "Abandoned Cart",
    status: "draft",
    scheduledAt: null,
    totalContacts: 45,
    sentCount: 0,
    deliveredCount: 0,
    readCount: 0,
    failedCount: 0,
    templateName: "Cart Reminder",
    createdAt: "2026-05-12T12:00:00Z",
  },
];

export const mockContacts: Contact[] = [
  { id: "1", name: "Alice Johnson", phoneNumber: "+14155551234", createdAt: "2026-05-01T10:00:00Z" },
  { id: "2", name: "Bob Smith", phoneNumber: "+14155555678", createdAt: "2026-05-02T11:00:00Z" },
  { id: "3", name: "Charlie Brown", phoneNumber: "+14155559012", createdAt: "2026-05-03T12:00:00Z" },
  { id: "4", name: "Diana Prince", phoneNumber: "+14155553456", createdAt: "2026-05-04T13:00:00Z" },
  { id: "5", name: "Evan Wright", phoneNumber: "+14155557890", createdAt: "2026-05-05T14:00:00Z" },
  { id: "6", name: "Fiona Gallagher", phoneNumber: "+14155551235", createdAt: "2026-05-06T15:00:00Z" },
  { id: "7", name: "George Miller", phoneNumber: "+14155555679", createdAt: "2026-05-07T16:00:00Z" },
];

export const mockTemplates: Template[] = [
  {
    id: "1",
    name: "Promo Template",
    body: "Hi {{name}}, check out our summer sale! Get 20% off on all items until {{date}}.",
    variables: ["name", "date"],
    createdAt: "2026-04-20T10:00:00Z",
  },
  {
    id: "2",
    name: "Announcement",
    body: "Hello {{name}}, we have a new arrival at {{business}}. Visit us today!",
    variables: ["name", "business"],
    createdAt: "2026-04-22T11:00:00Z",
  },
  {
    id: "3",
    name: "Newsletter",
    body: "Hey {{name}}, here is your weekly update from {{business}} for {{date}}.",
    variables: ["name", "business", "date"],
    createdAt: "2026-04-25T12:00:00Z",
  },
  {
    id: "4",
    name: "Cart Reminder",
    body: "Hi {{name}}, you left items in your cart. Complete your order before {{date}}.",
    variables: ["name", "date"],
    createdAt: "2026-05-01T09:00:00Z",
  },
];

export const mockBusiness = {
  name: "Acme Corp",
  connectionStatus: "connected" as const,
  dailyLimit: 250,
  todayUsage: 125,
  wabaId: "123456789",
  phoneNumberId: "987654321",
};
