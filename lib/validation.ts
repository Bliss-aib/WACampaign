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
