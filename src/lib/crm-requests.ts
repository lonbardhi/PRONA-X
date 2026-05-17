import { z } from "zod";

import { getIntlLocale, type Locale } from "./i18n.ts";
import {
  formatPropertyType,
  isRentalTransaction,
  propertyTypes,
  rentPeriods,
  type PropertyTransactionType,
  type PropertyType,
  type RentPeriod,
} from "./properties.ts";

export const crmRequestTypes = ["buyer", "tenant", "owner", "investor"] as const;

export const crmRequestStatuses = [
  "new",
  "contacted",
  "matching",
  "viewing",
  "offer",
  "converted",
  "nurture",
  "lost",
  "archived",
] as const;

export const crmRequestSources = [
  "website",
  "whatsapp",
  "phone_call",
  "referral",
  "walk_in",
  "social",
  "existing_client",
  "other",
] as const;

export const crmRequestMatchStatuses = [
  "suggested",
  "sent",
  "viewing",
  "offer",
  "converted",
  "rejected",
] as const;

export type CrmRequestType = (typeof crmRequestTypes)[number];
export type CrmRequestStatus = (typeof crmRequestStatuses)[number];
export type CrmRequestSource = (typeof crmRequestSources)[number];
export type CrmRequestMatchStatus = (typeof crmRequestMatchStatuses)[number];

export type CrmRequestRecord = {
  id: string;
  request_type: CrmRequestType;
  status: CrmRequestStatus;
  customer_name: string;
  phone: string;
  phone_normalized: string;
  email: string | null;
  preferred_contact_method: string | null;
  source: CrmRequestSource;
  source_details: string | null;
  city: string | null;
  area: string | null;
  property_type: PropertyType | null;
  min_budget_eur: number | null;
  max_budget_eur: number | null;
  rent_period: RentPeriod | null;
  bedrooms_min: number | null;
  area_min_m2: number | null;
  urgency: string | null;
  notes: string | null;
  next_follow_up_at: string | null;
  last_contacted_at: string | null;
  matched_property_id: string | null;
  converted_property_id: string | null;
  assigned_agent_id: string | null;
  assigned_agent_name: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CrmRequestMatchRecord = {
  id: string;
  request_id: string;
  property_id: string;
  match_status: CrmRequestMatchStatus;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  sent_at: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
};

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

const optionalNumber = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.coerce.number().min(0, "Vlera duhet të jetë numër pozitiv.").optional(),
);

const optionalInteger = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.coerce.number().int().min(0, "Vlera duhet të jetë numër i plotë pozitiv.").optional(),
);

const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().optional(),
);

export const crmRequestSchema = z
  .object({
    area: optionalText,
    area_min_m2: optionalNumber,
    assigned_agent_id: optionalText,
    assigned_agent_name: optionalText,
    bedrooms_min: optionalInteger,
    city: optionalText,
    customer_name: z
      .string()
      .trim()
      .min(2, "Emri i klientit është i detyrueshëm."),
    email: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.string().trim().email("Email-i nuk është i vlefshëm.").optional(),
    ),
    max_budget_eur: optionalNumber,
    min_budget_eur: optionalNumber,
    next_follow_up_at: optionalDate,
    notes: optionalText,
    phone: z.string().trim().min(6, "Numri i telefonit është i detyrueshëm."),
    preferred_contact_method: z
      .enum(["phone", "whatsapp", "email", "in_person"])
      .default("phone"),
    property_type: z.enum(propertyTypes).optional(),
    rent_period: z.enum(rentPeriods).optional(),
    request_type: z.enum(crmRequestTypes),
    source: z.enum(crmRequestSources, {
      message: "Zgjidh burimin e kërkesës.",
    }),
    source_details: optionalText,
    status: z.enum(crmRequestStatuses).default("new"),
    urgency: z.enum(["hot", "warm", "cold"]).default("warm"),
  })
  .superRefine((value, context) => {
    const normalizedPhone = normalizeRequestPhone(value.phone);
    if (normalizedPhone.length < 6) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Shkruaj një numër telefoni të vlefshëm.",
        path: ["phone"],
      });
    }

    if (
      value.min_budget_eur != null &&
      value.max_budget_eur != null &&
      value.max_budget_eur < value.min_budget_eur
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Buxheti maksimal nuk mund të jetë më i ulët se minimumi.",
        path: ["max_budget_eur"],
      });
    }

    if (value.request_type === "tenant" && !value.rent_period) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Zgjidh periudhën e qirasë për kërkesat e qiramarrësve.",
        path: ["rent_period"],
      });
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

export type CrmRequestInput = z.infer<typeof crmRequestSchema>;

export function formDataToCrmRequestInput(formData: FormData) {
  return crmRequestSchema.parse({
    area: formData.get("area") || undefined,
    area_min_m2: formData.get("area_min_m2") || "",
    assigned_agent_id: formData.get("assigned_agent_id") || undefined,
    assigned_agent_name: formData.get("assigned_agent_name") || undefined,
    bedrooms_min: formData.get("bedrooms_min") || "",
    city: formData.get("city") || undefined,
    customer_name: formData.get("customer_name"),
    email: formData.get("email") || undefined,
    max_budget_eur: formData.get("max_budget_eur") || "",
    min_budget_eur: formData.get("min_budget_eur") || "",
    next_follow_up_at: formData.get("next_follow_up_at") || undefined,
    notes: formData.get("notes") || undefined,
    phone: formData.get("phone"),
    preferred_contact_method: formData.get("preferred_contact_method") || "phone",
    property_type: formData.get("property_type") || undefined,
    rent_period: formData.get("rent_period") || undefined,
    request_type: formData.get("request_type") || "buyer",
    source: formData.get("source") || "phone_call",
    source_details: formData.get("source_details") || undefined,
    status: formData.get("status") || "new",
    urgency: formData.get("urgency") || "warm",
  });
}

export function normalizeRequestPhone(phone: string) {
  const clean = phone.replace(/[^\d+]/g, "");
  if (clean.startsWith("+")) {
    return `+${clean.slice(1).replace(/\D/g, "")}`;
  }

  return clean.replace(/\D/g, "");
}

export function getRequestModulePath(type: CrmRequestType) {
  if (type === "tenant") {
    return "/rentals";
  }

  if (type === "buyer" || type === "investor") {
    return "/sales";
  }

  return "/requests";
}

export function isBuyerRequest(type: CrmRequestType) {
  return type === "buyer" || type === "investor";
}

export function isTenantRequest(type: CrmRequestType) {
  return type === "tenant";
}

export function canRequestCreateListing(type: CrmRequestType) {
  return type === "owner";
}

export function canRequestMatchProperty(
  requestType: CrmRequestType,
  transactionType: PropertyTransactionType | null | undefined,
) {
  if (requestType === "buyer" || requestType === "investor") {
    return transactionType === "sale";
  }

  if (requestType === "tenant") {
    return isRentalTransaction(transactionType);
  }

  return false;
}

export function getRequestMatchScopeMessage(
  requestType: CrmRequestType,
  locale: Locale,
) {
  if (requestType === "tenant") {
    return locale === "sq"
      ? "Kerkesat e qiramarrsve mund te lidhen vetem me listime me qira."
      : "Tenant requests can only be matched with rental listings.";
  }

  if (requestType === "buyer" || requestType === "investor") {
    return locale === "sq"
      ? "Kerkesat e blerjes mund te lidhen vetem me listime per shitje."
      : "Buy and investor requests can only be matched with sale listings.";
  }

  return locale === "sq"
    ? "Kerkesat e pronareve nuk lidhen si perputhje listimi; krijo listim te ri per shitje ose qira."
    : "Owner requests are not listing matches; create a new sale or rental listing instead.";
}

export function formatCrmRequestType(type: CrmRequestType, locale: Locale) {
  const labels: Record<Locale, Record<CrmRequestType, string>> = {
    sq: {
      buyer: "Kërkesë blerësi",
      investor: "Kërkesë investitori",
      owner: "Kërkesë pronari",
      tenant: "Kërkesë qiramarrësi",
    },
    en: {
      buyer: "Buyer request",
      investor: "Investor request",
      owner: "Owner request",
      tenant: "Tenant request",
    },
  };

  return labels[locale][type];
}

export function formatCrmRequestBadge(type: CrmRequestType, locale: Locale) {
  if (locale === "en") {
    return formatCrmRequestType(type, locale).toUpperCase();
  }

  const labels: Record<CrmRequestType, string> = {
    buyer: "KËRKESË BLERËSI",
    investor: "KËRKESË INVESTITORI",
    owner: "KËRKESË PRONARI",
    tenant: "KËRKESË QIRAMARRËSI",
  };

  return labels[type];
}

export function formatCrmRequestStatus(status: CrmRequestStatus, locale: Locale) {
  const labels: Record<Locale, Record<CrmRequestStatus, string>> = {
    sq: {
      archived: "Arkivuar",
      contacted: "Kontaktuar",
      converted: "Konvertuar",
      lost: "Humbur",
      matching: "Në përputhje",
      new: "E re",
      nurture: "Në ndjekje",
      offer: "Ofertë",
      viewing: "Vizitë",
    },
    en: {
      archived: "Archived",
      contacted: "Contacted",
      converted: "Converted",
      lost: "Lost",
      matching: "Matching",
      new: "New",
      nurture: "Nurture",
      offer: "Offer",
      viewing: "Viewing",
    },
  };

  return labels[locale][status];
}

export function formatCrmRequestSource(source: CrmRequestSource, locale: Locale) {
  const labels: Record<Locale, Record<CrmRequestSource, string>> = {
    sq: {
      existing_client: "Klient ekzistues",
      other: "Tjetër",
      phone_call: "Telefonatë",
      referral: "Referim",
      social: "Rrjete sociale",
      walk_in: "Në zyrë",
      website: "Website",
      whatsapp: "WhatsApp",
    },
    en: {
      existing_client: "Existing client",
      other: "Other",
      phone_call: "Phone call",
      referral: "Referral",
      social: "Social",
      walk_in: "Walk-in",
      website: "Website",
      whatsapp: "WhatsApp",
    },
  };

  return labels[locale][source];
}

export function formatCrmRequestMatchStatus(
  status: CrmRequestMatchStatus,
  locale: Locale,
) {
  const labels: Record<Locale, Record<CrmRequestMatchStatus, string>> = {
    sq: {
      converted: "Konvertuar",
      offer: "Ofertë",
      rejected: "Refuzuar",
      sent: "Dërguar",
      suggested: "Sugjeruar",
      viewing: "Vizitë",
    },
    en: {
      converted: "Converted",
      offer: "Offer",
      rejected: "Rejected",
      sent: "Sent",
      suggested: "Suggested",
      viewing: "Viewing",
    },
  };

  return labels[locale][status];
}

export function formatRequestBudget(request: CrmRequestRecord, locale: Locale) {
  const label = isTenantRequest(request.request_type)
    ? locale === "sq"
      ? "Buxheti mujor"
      : "Monthly budget"
    : locale === "sq"
      ? "Buxheti"
      : "Budget";
  const formatter = new Intl.NumberFormat(getIntlLocale(locale), {
    currency: "EUR",
    maximumFractionDigits: 0,
    style: "currency",
  });

  if (request.min_budget_eur == null && request.max_budget_eur == null) {
    return `${label}: ${locale === "sq" ? "Pa buxhet" : "No budget"}`;
  }

  if (request.min_budget_eur != null && request.max_budget_eur != null) {
    return `${label}: ${formatter.format(request.min_budget_eur)} - ${formatter.format(request.max_budget_eur)}`;
  }

  if (request.min_budget_eur != null) {
    return `${label}: ${formatter.format(request.min_budget_eur)}+`;
  }

  return `${label}: ${locale === "sq" ? "deri" : "up to"} ${formatter.format(request.max_budget_eur || 0)}`;
}

export function formatRequestLocation(request: CrmRequestRecord, locale: Locale) {
  return [request.area, request.city].filter(Boolean).join(", ") || (locale === "sq" ? "Pa lokacion" : "No location");
}

export function formatRequestPropertyType(type: PropertyType | null, locale: Locale) {
  return type ? formatPropertyType(type, locale) : locale === "sq" ? "Çdo tip prone" : "Any property type";
}
