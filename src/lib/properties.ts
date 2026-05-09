import { z } from "zod";

import type { AppointmentRecord } from "@/lib/appointments";
import { defaultLocale, getIntlLocale, type Locale } from "@/lib/i18n";

export const propertyTypes = [
  "apartment",
  "house",
  "villa",
  "land",
  "development_land",
  "commercial",
  "office",
] as const;

export const standardPropertyStatuses = [
  "draft",
  "published",
  "reserved",
  "sold",
  "rented",
  "archived",
] as const;

export const developmentLandStatuses = [
  "draft",
  "landowner_contacted",
  "documents_pending",
  "documents_verified",
  "feasibility_review",
  "ready_for_developers",
  "presented_to_developers",
  "developer_interested",
  "offer_received",
  "negotiation",
  "agreement_in_principle",
  "contract_drafting",
  "agreement_signed",
  "project_in_progress",
  "completed",
  "rejected",
  "withdrawn",
  "archived",
] as const;

export const propertyStatuses = [
  "draft",
  "published",
  "reserved",
  "sold",
  "rented",
  "archived",
  "landowner_contacted",
  "documents_pending",
  "documents_verified",
  "feasibility_review",
  "ready_for_developers",
  "presented_to_developers",
  "developer_interested",
  "offer_received",
  "negotiation",
  "agreement_in_principle",
  "contract_drafting",
  "agreement_signed",
  "project_in_progress",
  "completed",
  "rejected",
  "withdrawn",
] as const;

const optionalNumber = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.coerce.number().min(0).optional(),
);

const optionalInteger = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.coerce.number().int().min(0).optional(),
);

const optionalPercentage = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.coerce.number().min(0).max(100).optional(),
);

export const propertySchema = z
  .object({
    title: z.string().trim().min(3, "Title is required"),
    description: z.string().trim().optional(),
    type: z.enum(propertyTypes),
    status: z.enum(propertyStatuses),
    city: z.string().trim().min(2, "City is required"),
    neighborhood: z.string().trim().optional(),
    address: z.string().trim().optional(),
    price_eur: optionalNumber,
    bedrooms: optionalInteger,
    bathrooms: optionalInteger,
    area_m2: optionalNumber,
    year_built: z.preprocess(
      (value) => (value === "" || value == null ? undefined : value),
      z.coerce.number().int().min(1800).max(2100).optional(),
    ),
    plot_size_m2: optionalNumber,
    land_certificate_number: z.string().trim().optional(),
    cadastral_zone: z.string().trim().optional(),
    parcel_number: z.string().trim().optional(),
    ownership_status: z.string().trim().optional(),
    landowners_count: optionalInteger,
    current_land_use: z.string().trim().optional(),
    development_zone: z.string().trim().optional(),
    building_coefficient: optionalNumber,
    max_floors: optionalInteger,
    estimated_gross_buildable_area_m2: optionalNumber,
    estimated_net_sellable_area_m2: optionalNumber,
    estimated_apartments: optionalInteger,
    estimated_garages: optionalInteger,
    estimated_parking_spaces: optionalInteger,
    estimated_commercial_units: optionalInteger,
    road_access: z.string().trim().optional(),
    utilities_access: z.string().trim().optional(),
    planning_permission_status: z.string().trim().optional(),
    construction_permit_status: z.string().trim().optional(),
    urban_study_status: z.string().trim().optional(),
    landowner_requested_percentage: optionalPercentage,
    minimum_acceptable_percentage: optionalPercentage,
    preferred_compensation_type: z.string().trim().optional(),
    preferred_floor_allocation: z.string().trim().optional(),
    preferred_unit_orientation: z.string().trim().optional(),
    agreement_notes: z.string().trim().optional(),
    negotiation_status: z.string().trim().optional(),
    developer_name: z.string().trim().optional(),
    developer_contact: z.string().trim().optional(),
    developer_offered_percentage: optionalPercentage,
    developer_proposed_project_size: z.string().trim().optional(),
    developer_proposed_delivery_timeline: z.string().trim().optional(),
    developer_proposed_unit_allocation: z.string().trim().optional(),
    developer_conditions: z.string().trim().optional(),
    developer_offer_status: z.string().trim().optional(),
    visibility: z.string().trim().optional(),
  })
  .superRefine((value, context) => {
    if (value.type !== "development_land" && value.price_eur == null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Price is required for standard sale properties",
        path: ["price_eur"],
      });
    }

    if (value.type === "development_land" && value.status !== "draft") {
      if (value.plot_size_m2 == null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Plot size is required for Development Land",
          path: ["plot_size_m2"],
        });
      }
    }

    if (
      value.type === "development_land" &&
      value.status === "ready_for_developers" &&
      value.landowner_requested_percentage == null
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Landowner requested percentage is required",
        path: ["landowner_requested_percentage"],
      });
    }

    if (
      value.minimum_acceptable_percentage != null &&
      value.landowner_requested_percentage != null &&
      value.minimum_acceptable_percentage > value.landowner_requested_percentage
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum acceptable percentage cannot be higher than requested percentage",
        path: ["minimum_acceptable_percentage"],
      });
    }
  });

export type PropertyFormInput = z.infer<typeof propertySchema>;
export type PropertyStatus = (typeof propertyStatuses)[number];
export type StandardPropertyStatus = (typeof standardPropertyStatuses)[number];
export type PropertyType = (typeof propertyTypes)[number];

export type PropertyMedia = {
  id: string;
  public_url: string;
  alt_text: string | null;
  sort_order: number;
};

export type PropertyRecord = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  type: PropertyType;
  status: PropertyStatus;
  city: string;
  neighborhood: string | null;
  address: string | null;
  price_eur: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_m2: number | null;
  year_built: number | null;
  plot_size_m2: number | null;
  land_certificate_number: string | null;
  cadastral_zone: string | null;
  parcel_number: string | null;
  ownership_status: string | null;
  landowners_count: number | null;
  current_land_use: string | null;
  development_zone: string | null;
  building_coefficient: number | null;
  max_floors: number | null;
  estimated_gross_buildable_area_m2: number | null;
  estimated_net_sellable_area_m2: number | null;
  estimated_apartments: number | null;
  estimated_garages: number | null;
  estimated_parking_spaces: number | null;
  estimated_commercial_units: number | null;
  road_access: string | null;
  utilities_access: string | null;
  planning_permission_status: string | null;
  construction_permit_status: string | null;
  urban_study_status: string | null;
  landowner_requested_percentage: number | null;
  minimum_acceptable_percentage: number | null;
  preferred_compensation_type: string | null;
  preferred_floor_allocation: string | null;
  preferred_unit_orientation: string | null;
  agreement_notes: string | null;
  negotiation_status: string | null;
  developer_name: string | null;
  developer_contact: string | null;
  developer_offered_percentage: number | null;
  developer_proposed_project_size: string | null;
  developer_proposed_delivery_timeline: string | null;
  developer_proposed_unit_allocation: string | null;
  developer_conditions: string | null;
  developer_offer_status: string | null;
  visibility: string | null;
  created_at: string;
  property_media: PropertyMedia[];
  appointments?: AppointmentRecord[];
};

export function formDataToPropertyInput(formData: FormData) {
  return propertySchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    type: formData.get("type"),
    status: formData.get("status"),
    city: formData.get("city"),
    neighborhood: formData.get("neighborhood") || undefined,
    address: formData.get("address") || undefined,
    price_eur: formData.get("price_eur"),
    bedrooms: formData.get("bedrooms") || "",
    bathrooms: formData.get("bathrooms") || "",
    area_m2: formData.get("area_m2") || "",
    year_built: formData.get("year_built") || "",
    plot_size_m2: formData.get("plot_size_m2") || "",
    land_certificate_number: formData.get("land_certificate_number") || undefined,
    cadastral_zone: formData.get("cadastral_zone") || undefined,
    parcel_number: formData.get("parcel_number") || undefined,
    ownership_status: formData.get("ownership_status") || undefined,
    landowners_count: formData.get("landowners_count") || "",
    current_land_use: formData.get("current_land_use") || undefined,
    development_zone: formData.get("development_zone") || undefined,
    building_coefficient: formData.get("building_coefficient") || "",
    max_floors: formData.get("max_floors") || "",
    estimated_gross_buildable_area_m2:
      formData.get("estimated_gross_buildable_area_m2") || "",
    estimated_net_sellable_area_m2:
      formData.get("estimated_net_sellable_area_m2") || "",
    estimated_apartments: formData.get("estimated_apartments") || "",
    estimated_garages: formData.get("estimated_garages") || "",
    estimated_parking_spaces: formData.get("estimated_parking_spaces") || "",
    estimated_commercial_units: formData.get("estimated_commercial_units") || "",
    road_access: formData.get("road_access") || undefined,
    utilities_access: formData.get("utilities_access") || undefined,
    planning_permission_status:
      formData.get("planning_permission_status") || undefined,
    construction_permit_status:
      formData.get("construction_permit_status") || undefined,
    urban_study_status: formData.get("urban_study_status") || undefined,
    landowner_requested_percentage:
      formData.get("landowner_requested_percentage") || "",
    minimum_acceptable_percentage:
      formData.get("minimum_acceptable_percentage") || "",
    preferred_compensation_type:
      formData.get("preferred_compensation_type") || undefined,
    preferred_floor_allocation:
      formData.get("preferred_floor_allocation") || undefined,
    preferred_unit_orientation:
      formData.get("preferred_unit_orientation") || undefined,
    agreement_notes: formData.get("agreement_notes") || undefined,
    negotiation_status: formData.get("negotiation_status") || undefined,
    developer_name: formData.get("developer_name") || undefined,
    developer_contact: formData.get("developer_contact") || undefined,
    developer_offered_percentage:
      formData.get("developer_offered_percentage") || "",
    developer_proposed_project_size:
      formData.get("developer_proposed_project_size") || undefined,
    developer_proposed_delivery_timeline:
      formData.get("developer_proposed_delivery_timeline") || undefined,
    developer_proposed_unit_allocation:
      formData.get("developer_proposed_unit_allocation") || undefined,
    developer_conditions: formData.get("developer_conditions") || undefined,
    developer_offer_status: formData.get("developer_offer_status") || undefined,
    visibility: formData.get("visibility") || undefined,
  });
}

export function normalizeOptionalNumber(value: number | undefined) {
  return value === undefined ? null : value;
}

export function createSlug(title: string) {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 64);

  return `${base || "property"}-${crypto.randomUUID().slice(0, 8)}`;
}

export function formatEuro(value: number, locale: Locale = defaultLocale) {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function isDevelopmentLand(property: PropertyRecord | PropertyType) {
  return typeof property === "string"
    ? property === "development_land"
    : property.type === "development_land";
}

export function formatPropertyType(type: PropertyType, locale: Locale = defaultLocale) {
  const labels: Record<Locale, Record<PropertyType, string>> = {
    sq: {
      apartment: "Apartament",
      commercial: "Komerciale",
      development_land: "Tokë Zhvillimi",
      house: "Shtëpi",
      land: "Tokë",
      office: "Zyrë",
      villa: "Vilë",
    },
    en: {
      apartment: "Apartment",
      commercial: "Commercial",
      development_land: "Development Land",
      house: "House",
      land: "Land",
      office: "Office",
      villa: "Villa",
    },
  };

  return labels[locale][type];
}

export function formatStatusLabel(status: PropertyStatus, locale: Locale = defaultLocale) {
  const labels: Record<Locale, Partial<Record<PropertyStatus, string>>> = {
    sq: {
      agreement_in_principle: "Marrëveshje Parimore",
      agreement_signed: "Marrëveshje e Nënshkruar",
      archived: "Arkivuar",
      completed: "Përfunduar",
      contract_drafting: "Draft Kontrate",
      developer_interested: "Zhvillues i Interesuar",
      documents_pending: "Dokumente në Pritje",
      documents_verified: "Dokumente të Verifikuara",
      draft: "Draft",
      feasibility_review: "Rishikim Fizibiliteti",
      landowner_contacted: "Pronari i Kontaktuar",
      negotiation: "Negocim",
      offer_received: "Ofertë e Marrë",
      presented_to_developers: "Prezantuar Zhvilluesve",
      project_in_progress: "Projekt në Proces",
      published: "Publikuar",
      ready_for_developers: "Gati për Zhvillues",
      rejected: "Refuzuar",
      rented: "Dhënë me Qira",
      reserved: "Rezervuar",
      sold: "Shitur",
      withdrawn: "Tërhequr",
    },
    en: {},
  };

  const label = labels[locale][status];
  if (label) {
    return label;
  }

  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatPercentage(value: number, locale: Locale = defaultLocale) {
  return `${Number(value).toLocaleString(getIntlLocale(locale), {
    maximumFractionDigits: 2,
  })}%`;
}

export function calculateGrossBuildableArea(
  plotSize: number | null | undefined,
  coefficient: number | null | undefined,
) {
  if (plotSize == null || coefficient == null) {
    return null;
  }

  return Math.round(plotSize * coefficient * 100) / 100;
}

export function formatDevelopmentAgreement(
  property: PropertyRecord,
  locale: Locale = defaultLocale,
) {
  if (property.landowner_requested_percentage != null) {
    return `${locale === "sq" ? "Kërkesa e pronarit" : "Owner request"}: ${formatPercentage(
      property.landowner_requested_percentage,
      locale,
    )} ${locale === "sq" ? "e sipërfaqes së zhvilluar" : "of developed area"}`;
  }

  if (property.developer_offered_percentage != null) {
    return `${locale === "sq" ? "Oferta e zhvilluesit" : "Developer offer"}: ${formatPercentage(
      property.developer_offered_percentage,
      locale,
    )} ${locale === "sq" ? "e sipërfaqes së zhvilluar" : "of developed area"}`;
  }

  return locale === "sq"
    ? "Marrëveshje zhvillimi me përqindje"
    : "Percentage-based development agreement";
}
