import type { Locale } from "../../lib/i18n.ts";
import type { PropertyRecord } from "../../lib/properties.ts";

export const smartKitAssetTypes = [
  "pdf",
  "ai_description",
  "whatsapp_message",
  "quality_check",
] as const;

export const smartKitAssetStatuses = [
  "draft",
  "generated",
  "saved",
  "failed",
  "archived",
] as const;

export const aiDescriptionTones = [
  "professional",
  "luxury",
  "friendly",
  "investor_focused",
] as const;

export const aiDescriptionLengths = ["short", "medium", "long"] as const;
export const aiDescriptionAudiences = ["buyer", "renter", "investor"] as const;

export type SmartKitAssetType = (typeof smartKitAssetTypes)[number];
export type SmartKitAssetStatus = (typeof smartKitAssetStatuses)[number];
export type AiDescriptionTone = (typeof aiDescriptionTones)[number];
export type AiDescriptionLength = (typeof aiDescriptionLengths)[number];
export type AiDescriptionAudience = (typeof aiDescriptionAudiences)[number];

export type PublicMarketingAgent = {
  email: string | null;
  name: string | null;
  phone: string | null;
};

export type PublicMarketingListingPayload = {
  agent: PublicMarketingAgent | null;
  area_m2: number | null;
  bathrooms: number | null;
  bedrooms: number | null;
  currency: "EUR";
  description: string | null;
  features: string[];
  id: string;
  listing_status: string;
  location: {
    city: string | null;
    neighborhood: string | null;
  };
  photos: string[];
  price_eur: number | null;
  price_label: string;
  property_type: string;
  public_url: string | null;
  title: string;
  transaction_type: string;
  year_built: number | null;
};

export type AiDescriptionRequest = {
  language: Locale;
  length: AiDescriptionLength;
  targetAudience: AiDescriptionAudience;
  tone: AiDescriptionTone;
};

export type AiDescriptionResponse = {
  full_description: string;
  highlights: string[];
  missing_data_notes: string[];
  short_description: string;
  title_suggestions: [string, string, string];
  whatsapp_message: string;
};

export type PdfGenerationRequest = {
  includeAgentContact: boolean;
  includePrice: boolean;
  includeQrCode: boolean;
  templateKey: "client_brochure_default";
};

export type WhatsAppMessageResponse = {
  message: string;
  shareUrl: string;
};

export type QualityCheckStatus = "ready" | "needs_attention" | "incomplete";

export type QualityCheckItem = {
  key: string;
  label: string;
  message: string;
  passed: boolean;
};

export type QualityCheckResponse = {
  marketing_quality: QualityCheckItem[];
  recommended: QualityCheckItem[];
  required: QualityCheckItem[];
  status: QualityCheckStatus;
};

export type ListingMarketingAsset = {
  asset_type: SmartKitAssetType;
  content_json: Record<string, unknown>;
  content_text: string | null;
  created_at: string;
  file_path: string | null;
  file_url: string | null;
  id: string;
  language: string | null;
  listing_id: string;
  status: SmartKitAssetStatus;
  template_key: string | null;
  title: string | null;
};

export type SmartKitPropertyRecord = PropertyRecord & {
  created_by?: string | null;
};
