// FIX (H9 groundwork / C3 / H1): centralized request-body schemas using Zod.
//
// API routes previously trusted the JSON body shape entirely — missing fields,
// wrong types, or non-array values caused crashes (e.g. `contactIds.length` when
// contactIds was undefined) or unsafe DB writes. These schemas validate and
// coerce input at the route boundary. More schemas will be added in later phases.

import { z } from "zod";

/** Body for POST /api/campaigns. */
export const campaignCreateSchema = z.object({
  name: z.string().trim().min(1, "Campaign name is required").max(200),
  templateId: z.string().uuid("Invalid template id"),
  // FIX (H1): contactIds must be a non-empty array of uuids. The old code did
  // `contactIds.length` with no guard and threw when it was missing/not an array.
  contactIds: z.array(z.string().uuid()).min(1, "Select at least one contact"),
  // Accept an ISO datetime string or null/omitted (send-now).
  scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
  // Per-campaign template variable values (same for every recipient).
  variableValues: z.record(z.string(), z.string()).optional(),
});

export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;

// FIX (H2): allow-list of campaign statuses a USER may set via PATCH. System
// states ('sending', 'completed', 'failed', 'scheduled') are managed by the
// worker/queue — letting users PATCH to them bypassed the sending logic.
export const campaignStatusUpdateSchema = z.object({
  status: z.enum(["cancelled", "paused", "draft"]),
});

/** Body for POST /api/contacts. */
export const contactCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  // Loose E.164-ish check: optional leading +, 7–15 digits (spaces/dashes stripped).
  phone_number: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .transform((s) => s.replace(/[\s()-]/g, ""))
    .refine((s) => /^\+?[0-9]{7,15}$/.test(s), "Invalid phone number"),
});

/** Body for POST /api/templates. */
export const templateCreateSchema = z.object({
  name: z.string().trim().min(1, "Template name is required").max(200),
  body: z.string().trim().min(1, "Message body is required").max(2000),
  variables: z.array(z.string()).optional(),
  imageUrls: z.array(z.string()).optional(),
});

/** Body for PUT /api/templates/[id]. */
export const templateUpdateSchema = templateCreateSchema;

/** Body for POST /api/business (connect WhatsApp). */
export const businessConnectSchema = z.object({
  access_token: z.string().trim().min(1, "Access token is required"),
  waba_id: z.string().trim().min(1, "WABA id is required"),
  phone_number_id: z.string().trim().min(1, "Phone number id is required"),
  name: z.string().trim().max(200).optional(),
});

/** Body for POST /api/messages (free-form reply). */
export const messageSendSchema = z.object({
  to: z.string().trim().min(1, "Recipient is required"),
  text: z.string().trim().min(1, "Message text is required").max(4096),
});
