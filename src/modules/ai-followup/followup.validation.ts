import { z } from "zod";

import { leadActivityEventTypes, leadChannels } from "./followup.types";

const metadataSchema = z.record(z.string(), z.unknown()).default({});

export const leadIdSchema = z.string().uuid("Invalid lead id.");

export const createLeadActivityEventSchema = z.object({
  channel: z.enum(leadChannels).optional().default("unknown"),
  eventType: z.enum(leadActivityEventTypes),
  leadId: leadIdSchema,
  metadata: metadataSchema.optional().default({}),
  propertyId: z.string().uuid("Invalid property id.").optional(),
});

export const leadActivityEventQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
