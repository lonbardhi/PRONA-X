import { z } from "zod";

import { createSlug, type PropertyType } from "@/lib/properties";

export const sellerLeadStatuses = [
  "new",
  "contacted",
  "qualified",
  "listing_preparation",
  "manager_review",
  "converted",
  "nurture",
  "lost",
] as const;

export const sellerLeadSources = [
  "website",
  "referral",
  "facebook",
  "instagram",
  "whatsapp",
  "phone_call",
  "walk_in",
  "valuation_request",
  "external_listing",
  "expired_listing",
  "existing_client",
  "other",
] as const;

export const sellerLeadPropertyTypes = [
  "apartment",
  "house",
  "villa",
  "land",
  "development_land",
  "commercial",
  "office",
  "other",
] as const;

export const sellerLeadTimelines = [
  "immediately",
  "one_month",
  "one_to_three_months",
  "three_to_six_months",
  "six_plus_months",
  "not_sure",
] as const;

export const sellerLeadContactMethods = [
  "phone",
  "whatsapp",
  "email",
  "in_person",
] as const;

export type SellerLeadStatus = (typeof sellerLeadStatuses)[number];
export type SellerLeadSource = (typeof sellerLeadSources)[number];
export type SellerLeadPropertyType = (typeof sellerLeadPropertyTypes)[number];
export type SellerLeadTimeline = (typeof sellerLeadTimelines)[number];
export type SellerLeadContactMethod = (typeof sellerLeadContactMethods)[number];
export type SellerLeadTemperature = "hot" | "warm" | "cold";

export type SellerLeadRecord = {
  address: string | null;
  area: string | null;
  assigned_agent_id: string | null;
  assigned_agent_name: string | null;
  asking_reason: string | null;
  city: string | null;
  converted_property_id: string | null;
  created_at: string;
  documents_collected: boolean | null;
  expected_price: number | null;
  external_listing_url: string | null;
  id: string;
  last_contacted_at: string | null;
  lost_reason: string | null;
  next_follow_up_at: string | null;
  nurture_reason: string | null;
  ownership_confirmed: boolean | null;
  phone: string;
  phone_normalized: string;
  photos_collected: boolean | null;
  preferred_contact_method: SellerLeadContactMethod | null;
  property_type: SellerLeadPropertyType | null;
  quality_score: number;
  seller_email: string | null;
  seller_name: string;
  seller_notes: string | null;
  source: SellerLeadSource;
  source_details: string | null;
  status: SellerLeadStatus;
  temperature: SellerLeadTemperature;
  timeline: SellerLeadTimeline | null;
  updated_at: string;
  valuation_requested: boolean | null;
  assigned_agent?: {
    full_name: string | null;
    id: string;
  } | null;
};

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

const optionalNumber = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.coerce.number().min(0, "Çmimi duhet të jetë numër pozitiv.").optional(),
);

const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().optional(),
);

export const sellerLeadSchema = z
  .object({
    address: optionalText,
    area: optionalText,
    assigned_agent_id: optionalText,
    assigned_agent_name: optionalText,
    city: optionalText,
    documents_collected: z.boolean().optional(),
    expected_price: optionalNumber,
    external_listing_url: optionalText,
    ownership_confirmed: z.boolean().optional(),
    phone: z
      .string()
      .trim()
      .min(6, "Numri i telefonit është i detyrueshëm."),
    photos_collected: z.boolean().optional(),
    preferred_contact_method: z.enum(sellerLeadContactMethods).default("phone"),
    property_type: z.enum(sellerLeadPropertyTypes).optional(),
    seller_email: z
      .preprocess(
        (value) =>
          typeof value === "string" && value.trim() === "" ? undefined : value,
        z.string().trim().email("Email-i nuk është i vlefshëm.").optional(),
      ),
    seller_name: z
      .string()
      .trim()
      .min(2, "Emri i shitësit është i detyrueshëm."),
    seller_notes: optionalText,
    source: z.enum(sellerLeadSources, {
      message: "Zgjidh burimin e lead-it.",
    }),
    source_details: optionalText,
    status: z.enum(sellerLeadStatuses).default("new"),
    timeline: z.enum(sellerLeadTimelines).optional(),
    valuation_requested: z.boolean().optional(),
    next_follow_up_at: optionalDate,
    asking_reason: optionalText,
  })
  .superRefine((value, context) => {
    const normalizedPhone = normalizePhone(value.phone);
    if (normalizedPhone.length < 6) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Shkruaj një numër telefoni të vlefshëm.",
        path: ["phone"],
      });
    }

    if (
      (value.source === "external_listing" ||
        value.source === "expired_listing") &&
      value.external_listing_url
    ) {
      try {
        new URL(value.external_listing_url);
      } catch {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Linku i listimit të jashtëm nuk është i vlefshëm.",
          path: ["external_listing_url"],
        });
      }
    }

    if (value.next_follow_up_at) {
      const nextFollowUp = new Date(value.next_follow_up_at);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (Number.isNaN(nextFollowUp.getTime()) || nextFollowUp < today) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Data e ndjekjes nuk mund të jetë në të kaluarën.",
          path: ["next_follow_up_at"],
        });
      }
    }
  });

export type SellerLeadInput = z.infer<typeof sellerLeadSchema>;

export function formDataToSellerLeadInput(formData: FormData) {
  return sellerLeadSchema.parse({
    address: formData.get("address") || undefined,
    area: formData.get("area") || undefined,
    assigned_agent_id: formData.get("assigned_agent_id") || undefined,
    assigned_agent_name: formData.get("assigned_agent_name") || undefined,
    asking_reason: formData.get("asking_reason") || undefined,
    city: formData.get("city") || undefined,
    documents_collected: formData.get("documents_collected") === "on",
    expected_price: formData.get("expected_price") || undefined,
    external_listing_url: formData.get("external_listing_url") || undefined,
    next_follow_up_at: formData.get("next_follow_up_at") || undefined,
    ownership_confirmed: formData.get("ownership_confirmed") === "on",
    phone: formData.get("phone"),
    photos_collected: formData.get("photos_collected") === "on",
    preferred_contact_method: formData.get("preferred_contact_method") || "phone",
    property_type: formData.get("property_type") || undefined,
    seller_email: formData.get("seller_email") || undefined,
    seller_name: formData.get("seller_name"),
    seller_notes: formData.get("seller_notes") || undefined,
    source: formData.get("source"),
    source_details: formData.get("source_details") || undefined,
    status: formData.get("status") || "new",
    timeline: formData.get("timeline") || undefined,
    valuation_requested: formData.get("valuation_requested") === "on",
  });
}

export function normalizePhone(phone: string) {
  const clean = phone.replace(/[^\d+]/g, "");
  if (clean.startsWith("+")) {
    return `+${clean.slice(1).replace(/\D/g, "")}`;
  }

  return clean.replace(/\D/g, "");
}

export function calculateSellerLeadScore(
  lead: Partial<SellerLeadRecord | SellerLeadInput> & {
    created_at?: string | null;
    last_contacted_at?: string | null;
  },
) {
  let score = 0;

  if (lead.phone) score += 20;
  if (lead.seller_email) score += 10;
  if (lead.property_type) score += 15;
  if (lead.city || ("area" in lead && lead.area)) score += 15;
  if (lead.expected_price != null) score += 20;
  if (
    lead.timeline === "immediately" ||
    lead.timeline === "one_month" ||
    lead.timeline === "one_to_three_months"
  ) {
    score += 20;
  }
  if (lead.ownership_confirmed) score += 20;
  if (lead.documents_collected) score += 10;
  if (lead.photos_collected) score += 10;

  if (lead.created_at && !lead.last_contacted_at) {
    const ageMs = Date.now() - new Date(lead.created_at).getTime();
    if (ageMs > 7 * 24 * 60 * 60 * 1000) {
      score -= 20;
    }
  }

  if (lead.timeline === "six_plus_months" || lead.timeline === "not_sure") {
    score -= 20;
  }

  return Math.max(0, Math.min(100, score));
}

export function getSellerLeadTemperature(score: number): SellerLeadTemperature {
  if (score >= 80) return "hot";
  if (score >= 50) return "warm";
  return "cold";
}

export function getSellerLeadMissingRequirements(lead: SellerLeadRecord) {
  return [
    {
      complete: Boolean(lead.last_contacted_at || lead.status !== "new"),
      label: "Pronari u kontaktua",
    },
    { complete: Boolean(lead.ownership_confirmed), label: "Pronësia u konfirmua" },
    { complete: Boolean(lead.property_type), label: "Tipi i pronës u vendos" },
    { complete: Boolean(lead.city || lead.area || lead.address), label: "Lokacioni u vendos" },
    { complete: lead.expected_price != null, label: "Çmimi i pritshëm u vendos" },
    { complete: Boolean(lead.documents_collected), label: "Dokumentet u mblodhën" },
    { complete: Boolean(lead.photos_collected), label: "Foto/media u mblodhën" },
    {
      complete: lead.status === "manager_review" || lead.status === "converted",
      label: "Rishikimi nga menaxheri",
    },
  ];
}

export function canConvertSellerLead(
  lead: SellerLeadRecord,
  role?: string | null,
) {
  const allowedStatuses: SellerLeadStatus[] = [
    "qualified",
    "listing_preparation",
    "manager_review",
  ];

  if (role === "admin" || role === "manager") {
    return lead.status !== "converted" && lead.status !== "lost";
  }

  return allowedStatuses.includes(lead.status);
}

export function sellerLeadToPropertyPayload(
  lead: SellerLeadRecord,
  userId: string,
) {
  if (!lead.property_type || lead.property_type === "other") {
    throw new Error("Vendos tipin e pronës para konvertimit.");
  }

  if (lead.property_type !== "development_land" && lead.expected_price == null) {
    throw new Error("Vendos çmimin e pritshëm para krijimit të pronës draft.");
  }

  const titleParts = [
    lead.property_type === "development_land" ? "Tokë zhvillimi" : "Pronë nga lead",
    lead.area || lead.city,
    lead.seller_name,
  ].filter(Boolean);

  const description = [
    lead.seller_notes,
    lead.asking_reason ? `Arsye shitjeje: ${lead.asking_reason}` : null,
    `Lead shitësi: ${lead.seller_name}, ${lead.phone}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    address: lead.address,
    assigned_agent_id: lead.assigned_agent_id || userId,
    city: lead.city || "Pa qytet",
    created_by: userId,
    description: description || null,
    neighborhood: lead.area,
    price_eur:
      lead.property_type === "development_land" ? null : lead.expected_price,
    slug: createSlug(titleParts.join(" - ") || lead.seller_name),
    status: "draft" as const,
    title: titleParts.join(" - ") || `Lead ${lead.seller_name}`,
    type: lead.property_type as PropertyType,
    visibility: "internal_only",
  };
}

export function formatSellerLeadStatus(status: SellerLeadStatus) {
  const labels: Record<SellerLeadStatus, string> = {
    contacted: "Kontaktuar",
    converted: "Konvertuar",
    listing_preparation: "Përgatitje listimi",
    lost: "Humbur",
    manager_review: "Rishikim menaxheri",
    new: "I ri",
    nurture: "Për ndjekje afatgjatë",
    qualified: "Kualifikuar",
  };

  return labels[status];
}

export function formatSellerLeadSource(source: SellerLeadSource) {
  const labels: Record<SellerLeadSource, string> = {
    existing_client: "Klient ekzistues",
    expired_listing: "Listim i skaduar",
    external_listing: "Listim i jashtëm",
    facebook: "Facebook",
    instagram: "Instagram",
    other: "Tjetër",
    phone_call: "Telefonatë",
    referral: "Referim",
    valuation_request: "Kërkesë vlerësimi",
    walk_in: "Në zyrë",
    website: "Website",
    whatsapp: "WhatsApp",
  };

  return labels[source];
}

export function formatSellerLeadPropertyType(type: SellerLeadPropertyType | null) {
  const labels: Record<SellerLeadPropertyType, string> = {
    apartment: "Apartament",
    commercial: "Komerciale",
    development_land: "Tokë zhvillimi",
    house: "Shtëpi",
    land: "Tokë",
    office: "Zyrë",
    other: "Tjetër",
    villa: "Vilë",
  };

  return type ? labels[type] : "Pa tip";
}

export function formatSellerLeadTimeline(timeline: SellerLeadTimeline | null) {
  if (!timeline) return "Pa afat";

  const labels: Record<SellerLeadTimeline, string> = {
    immediately: "Menjëherë",
    not_sure: "Nuk është i sigurt",
    one_month: "1 muaj",
    one_to_three_months: "1-3 muaj",
    six_plus_months: "6+ muaj",
    three_to_six_months: "3-6 muaj",
  };

  return labels[timeline];
}

export function formatSellerLeadTemperature(temperature: SellerLeadTemperature) {
  const labels: Record<SellerLeadTemperature, string> = {
    cold: "Ftohtë",
    hot: "Hot",
    warm: "Warm",
  };

  return labels[temperature];
}

export function createWhatsAppUrl(phone: string) {
  const digits = normalizePhone(phone).replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : "#";
}
