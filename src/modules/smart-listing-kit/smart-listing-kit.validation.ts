import { z } from "zod";

import {
  aiDescriptionAudiences,
  aiDescriptionLengths,
  aiDescriptionTones,
} from "./smart-listing-kit.types.ts";

export const smartKitListingParamsSchema = z.object({
  id: z.string().uuid("Listing id is invalid."),
});

export const smartKitLocaleRequestSchema = z.object({
  locale: z.enum(["sq", "en"]).default("sq"),
});

export const pdfGenerationRequestSchema = z.object({
  includeAgentContact: z.boolean().default(true),
  includePrice: z.boolean().default(true),
  includeQrCode: z.boolean().default(true),
  locale: z.enum(["sq", "en"]).default("sq"),
  templateKey: z.literal("client_brochure_default").default("client_brochure_default"),
});

export const aiDescriptionRequestSchema = z.object({
  language: z.enum(["sq", "en"]).default("sq"),
  length: z.enum(aiDescriptionLengths).default("medium"),
  targetAudience: z.enum(aiDescriptionAudiences).default("buyer"),
  tone: z.enum(aiDescriptionTones).default("professional"),
});

export const saveDescriptionRequestSchema = z.object({
  assetId: z.string().uuid("Generated asset id is invalid.").optional(),
  description: z.string().trim().min(20, "Description is too short to save."),
});

export type PdfGenerationRequestInput = z.infer<typeof pdfGenerationRequestSchema>;
export type AiDescriptionRequestInput = z.infer<typeof aiDescriptionRequestSchema>;
export type SaveDescriptionRequestInput = z.infer<typeof saveDescriptionRequestSchema>;
export type SmartKitLocaleRequestInput = z.infer<typeof smartKitLocaleRequestSchema>;
