import { z } from "zod";

import type { AppointmentRecord } from "./appointments.ts";
import { defaultLocale, getIntlLocale, type Locale } from "./i18n.ts";
import {
  detectPossiblySwappedLatLng,
  isCoordinateInSupportedRegion,
  isValidLatitude,
  isValidLongitude,
  parseCoordinate,
} from "./maps/coordinates.ts";

export const propertyTypes = [
  "apartment",
  "house",
  "villa",
  "land",
  "development_land",
  "commercial",
  "office",
  "shop",
  "warehouse",
  "hotel",
  "business",
  "development_project",
  "parking",
  "storage",
  "project_unit",
] as const;

export const propertyTransactionTypes = ["sale", "rent", "rent_to_own"] as const;

export const rentPeriods = ["daily", "weekly", "monthly", "yearly", "seasonal"] as const;

export const furnishedStates = [
  "furnished",
  "partially_furnished",
  "unfurnished",
  "unknown",
] as const;

export const salePropertyStatuses = [
  "draft",
  "published",
  "negotiation",
  "reserved",
  "sold",
  "landowner_contacted",
  "documents_pending",
  "documents_verified",
  "feasibility_review",
  "archived",
] as const;

export const standardPropertyStatuses = salePropertyStatuses;

export const rentalPropertyStatuses = [
  "draft",
  "published",
  "available",
  "viewing",
  "negotiation",
  "reserved",
  "contract_drafting",
  "rented",
  "contract_active",
  "contract_expiring",
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
  "available",
  "viewing",
  "reserved",
  "sold",
  "rented",
  "contract_active",
  "contract_expiring",
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

const optionalUuid = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.string().uuid("Assigned agent is invalid").optional(),
);

const optionalLatitude = z.preprocess(
  (value) => (value === "" || value == null ? undefined : parseCoordinate(value) ?? value),
  z.number().refine(isValidLatitude, "Latitude must be between -90 and 90").optional(),
);

const optionalLongitude = z.preprocess(
  (value) => (value === "" || value == null ? undefined : parseCoordinate(value) ?? value),
  z.number().refine(isValidLongitude, "Longitude must be between -180 and 180").optional(),
);

export const coordinateSources = [
  "manual",
  "map_picker",
  "city_centroid",
  "address_geocode",
  "imported_csv",
  "backfill",
  "unknown",
] as const;

export const coordinateConfidences = [
  "exact",
  "high",
  "medium",
  "low",
  "unknown",
] as const;

export const propertySchema = z
  .object({
    title: z.string().trim().min(3, "Title is required"),
    description: z.string().trim().optional(),
    type: z.enum(propertyTypes),
    transaction_type: z.enum(propertyTransactionTypes).default("sale"),
    status: z.enum(propertyStatuses),
    city: z.string().trim().min(2, "City is required"),
    neighborhood: z.string().trim().optional(),
    address: z.string().trim().optional(),
    latitude: optionalLatitude,
    longitude: optionalLongitude,
    location_is_approximate: z.preprocess(
      (value) => value === "on" || value === true || value === "true",
      z.boolean(),
    ),
    coordinate_source: z.enum(coordinateSources).optional(),
    coordinate_confidence: z.enum(coordinateConfidences).optional(),
    price_eur: optionalNumber,
    price_on_request: z.preprocess((value) => value === "on" || value === true, z.boolean()),
    rent_period: z.enum(rentPeriods).optional(),
    available_from: z.string().trim().optional(),
    deposit_eur: optionalNumber,
    minimum_lease_months: optionalInteger,
    maximum_lease_months: optionalInteger,
    furnished_state: z.enum(furnishedStates).optional(),
    utilities_included: z.preprocess((value) => value === "on" || value === true, z.boolean()),
    sublease_allowed: z.preprocess((value) => value === "on" || value === true, z.boolean()),
    business_use_allowed: z.preprocess((value) => value === "on" || value === true, z.boolean()),
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
    assigned_agent_id: optionalUuid,
  })
  .superRefine((value, context) => {
    const isRentalWorkflow =
      value.transaction_type === "rent" || value.transaction_type === "rent_to_own";
    const allowedStatuses = isRentalWorkflow
      ? rentalPropertyStatuses
      : value.type === "development_land"
        ? developmentLandStatuses
        : salePropertyStatuses;

    if (!(allowedStatuses as readonly string[]).includes(value.status)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: isRentalWorkflow
          ? "Rental status is not valid for this listing"
          : "Sale status is not valid for this listing",
        path: ["status"],
      });
    }

    const developmentExchangeWorkflow =
      value.type === "development_land" && !isRentalWorkflow;

    if (
      !developmentExchangeWorkflow &&
      !value.price_on_request &&
      value.price_eur == null
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: isRentalWorkflow
          ? "Rent amount is required for rental listings"
          : "Sale price is required for sale listings",
        path: ["price_eur"],
      });
    }

    if (isRentalWorkflow && !value.rent_period) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Rent period is required for rental listings",
        path: ["rent_period"],
      });
    }

    if (
      value.minimum_lease_months != null &&
      value.maximum_lease_months != null &&
      value.maximum_lease_months < value.minimum_lease_months
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Maximum lease duration cannot be lower than minimum lease duration",
        path: ["maximum_lease_months"],
      });
    }

    if (developmentExchangeWorkflow && value.status !== "draft") {
      if (value.plot_size_m2 == null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Plot size is required for Development Land",
          path: ["plot_size_m2"],
        });
      }
    }

    if (
      developmentExchangeWorkflow &&
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

    if ((value.latitude == null) !== (value.longitude == null)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Latitude and longitude must be saved together",
        path: ["latitude"],
      });
    }

    if (
      value.latitude != null &&
      value.longitude != null &&
      detectPossiblySwappedLatLng(value.latitude, value.longitude)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Latitude and longitude look swapped",
        path: ["latitude"],
      });
    }

    if (
      value.latitude != null &&
      value.longitude != null &&
      !isCoordinateInSupportedRegion(value.latitude, value.longitude)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Coordinates are outside the supported PRONA X market region",
        path: ["latitude"],
      });
    }
  });

export type PropertyFormInput = z.infer<typeof propertySchema>;
export type PropertyStatus = (typeof propertyStatuses)[number];
export type StandardPropertyStatus = (typeof standardPropertyStatuses)[number];
export type PropertyType = (typeof propertyTypes)[number];
export type PropertyTransactionType = (typeof propertyTransactionTypes)[number];
export type PropertyModule = "sales" | "rentals";
export type RentPeriod = (typeof rentPeriods)[number];
export type FurnishedState = (typeof furnishedStates)[number];
export type CoordinateSource = (typeof coordinateSources)[number];
export type CoordinateConfidence = (typeof coordinateConfidences)[number];

export type AssetDuplicateCandidate = {
  address: string | null;
  area_m2: number | null;
  asset_id: string | null;
  city: string;
  id: string;
  linked_rental_property_id: string | null;
  linked_sale_property_id: string | null;
  neighborhood: string | null;
  plot_size_m2: number | null;
  status: PropertyStatus;
  title: string;
  transaction_type: PropertyTransactionType;
  type: PropertyType;
};

export type AssetDuplicateInput = {
  address?: string | null;
  area_m2?: number | null;
  city?: string | null;
  neighborhood?: string | null;
  plot_size_m2?: number | null;
  type?: PropertyType | null;
};

export type PropertyMedia = {
  id: string;
  public_url: string;
  alt_text: string | null;
  sort_order: number;
};

export type PropertyAssignedAgent = {
  agency_name: string | null;
  avatar_url: string | null;
  email: string | null;
  full_name: string | null;
  id: string;
  phone: string | null;
  role: string | null;
};

export type PropertyAgentOption = PropertyAssignedAgent;

export type PropertyRecord = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  type: PropertyType;
  transaction_type: PropertyTransactionType;
  status: PropertyStatus;
  city: string;
  neighborhood: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  location_is_approximate: boolean | null;
  coordinate_source: CoordinateSource | null;
  coordinate_confidence: CoordinateConfidence | null;
  coordinates_updated_at: string | null;
  price_eur: number | null;
  price_on_request: boolean | null;
  rent_period: RentPeriod | null;
  available_from: string | null;
  deposit_eur: number | null;
  minimum_lease_months: number | null;
  maximum_lease_months: number | null;
  furnished_state: FurnishedState | null;
  utilities_included: boolean | null;
  sublease_allowed: boolean | null;
  business_use_allowed: boolean | null;
  asset_id: string | null;
  linked_sale_property_id: string | null;
  linked_rental_property_id: string | null;
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
  assigned_agent_id: string | null;
  assigned_agent?: PropertyAssignedAgent | null;
  created_at: string;
  property_media: PropertyMedia[];
  appointments?: AppointmentRecord[];
};

export function formDataToPropertyInput(formData: FormData) {
  return propertySchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    type: formData.get("type"),
    transaction_type: formData.get("transaction_type") || "sale",
    status: formData.get("status"),
    city: formData.get("city"),
    neighborhood: formData.get("neighborhood") || undefined,
    address: formData.get("address") || undefined,
    latitude: formData.get("latitude") || undefined,
    longitude: formData.get("longitude") || undefined,
    location_is_approximate: formData.get("location_is_approximate"),
    coordinate_source: formData.get("coordinate_source") || undefined,
    coordinate_confidence: formData.get("coordinate_confidence") || undefined,
    price_eur: formData.get("price_eur"),
    price_on_request: formData.get("price_on_request"),
    rent_period: formData.get("rent_period") || undefined,
    available_from: formData.get("available_from") || undefined,
    deposit_eur: formData.get("deposit_eur") || "",
    minimum_lease_months: formData.get("minimum_lease_months") || "",
    maximum_lease_months: formData.get("maximum_lease_months") || "",
    furnished_state: formData.get("furnished_state") || undefined,
    utilities_included: formData.get("utilities_included"),
    sublease_allowed: formData.get("sublease_allowed"),
    business_use_allowed: formData.get("business_use_allowed"),
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
    assigned_agent_id: formData.get("assigned_agent_id") || undefined,
  });
}

export function normalizeAssignedAgent(
  agent: PropertyAssignedAgent | PropertyAssignedAgent[] | null | undefined,
) {
  if (Array.isArray(agent)) {
    return agent[0] || null;
  }

  return agent || null;
}

export function getAssignedAgentDisplayName(
  agent: PropertyAssignedAgent | null | undefined,
) {
  return agent?.full_name || agent?.email || "PRONA X";
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

export function getPropertyModulePath(transactionType: PropertyTransactionType) {
  return transactionType === "sale" ? "/sales" : "/rentals";
}

export function countPhysicalAssets(
  properties: Array<Pick<PropertyRecord, "asset_id" | "id">>,
) {
  return new Set(properties.map((property) => property.asset_id || property.id)).size;
}

export function getOppositeListingTransactionType(
  transactionType: PropertyTransactionType,
): PropertyTransactionType {
  return isRentalTransaction(transactionType) ? "sale" : "rent";
}

export function getTransactionTypeForModule(module: PropertyModule): PropertyTransactionType {
  return module === "rentals" ? "rent" : "sale";
}

export function isRentalTransaction(transactionType: PropertyTransactionType | null | undefined) {
  return transactionType === "rent" || transactionType === "rent_to_own";
}

export function isSameTransactionWorkflow(
  first: PropertyTransactionType | null | undefined,
  second: PropertyTransactionType | null | undefined,
) {
  if (isRentalTransaction(first) || isRentalTransaction(second)) {
    return isRentalTransaction(first) && isRentalTransaction(second);
  }

  return first === second;
}

function normalizeAssetMatchValue(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getAddressTokenOverlap(first: string, second: string) {
  const firstTokens = new Set(first.split(" ").filter((token) => token.length > 2));
  const secondTokens = new Set(second.split(" ").filter((token) => token.length > 2));

  if (firstTokens.size === 0 || secondTokens.size === 0) {
    return 0;
  }

  return [...firstTokens].filter((token) => secondTokens.has(token)).length;
}

function getAreaMatchScore(first?: number | null, second?: number | null) {
  if (!first || !second) {
    return 0;
  }

  const difference = Math.abs(first - second);
  const largest = Math.max(first, second);
  const ratio = difference / largest;

  if (ratio <= 0.1) return 2;
  if (ratio <= 0.2) return 1;

  return 0;
}

export function getDuplicateAssetScore(
  input: AssetDuplicateInput,
  candidate: AssetDuplicateCandidate,
) {
  let score = 0;
  const inputCity = normalizeAssetMatchValue(input.city);
  const candidateCity = normalizeAssetMatchValue(candidate.city);
  const inputNeighborhood = normalizeAssetMatchValue(input.neighborhood);
  const candidateNeighborhood = normalizeAssetMatchValue(candidate.neighborhood);
  const inputAddress = normalizeAssetMatchValue(input.address);
  const candidateAddress = normalizeAssetMatchValue(candidate.address);

  if (input.type && candidate.type === input.type) {
    score += 3;
  }

  if (inputCity && candidateCity && inputCity === candidateCity) {
    score += 3;
  }

  if (
    inputNeighborhood &&
    candidateNeighborhood &&
    inputNeighborhood === candidateNeighborhood
  ) {
    score += 2;
  }

  if (inputAddress && candidateAddress) {
    const overlap = getAddressTokenOverlap(inputAddress, candidateAddress);
    if (
      overlap >= 2 ||
      inputAddress.includes(candidateAddress) ||
      candidateAddress.includes(inputAddress)
    ) {
      score += 2;
    }
  }

  score += getAreaMatchScore(
    input.area_m2 ?? input.plot_size_m2,
    candidate.area_m2 ?? candidate.plot_size_m2,
  );

  return score;
}

export function findDuplicateAssetCandidates(
  input: AssetDuplicateInput,
  candidates: AssetDuplicateCandidate[],
  limit = 3,
) {
  if (!input.city || normalizeAssetMatchValue(input.city).length < 2) {
    return [];
  }

  return candidates
    .map((candidate) => ({
      candidate,
      score: getDuplicateAssetScore(input, candidate),
    }))
    .filter((match) => match.score >= 5)
    .sort((first, second) => second.score - first.score)
    .slice(0, limit);
}

export function getPropertyWorkflowStatuses(
  transactionType: PropertyTransactionType,
  propertyType?: PropertyType,
) {
  if (isRentalTransaction(transactionType)) {
    return rentalPropertyStatuses;
  }

  return propertyType === "development_land"
    ? developmentLandStatuses
    : salePropertyStatuses;
}

export function formatRentPeriodLabel(
  period: RentPeriod | string | null | undefined,
  locale: Locale = defaultLocale,
) {
  const labels: Record<Locale, Record<string, string>> = {
    sq: {
      daily: "ditë",
      weekly: "javë",
      monthly: "muaj",
      yearly: "vit",
      seasonal: "sezonale",
    },
    en: {
      daily: "day",
      weekly: "week",
      monthly: "month",
      yearly: "year",
      seasonal: "season",
    },
  };

  return labels[locale][period || "monthly"] || labels[locale].monthly;
}

export function formatTransactionBadge(
  transactionType: PropertyTransactionType | null | undefined,
  locale: Locale = defaultLocale,
) {
  if (transactionType === "rent_to_own") {
    return locale === "sq" ? "ME QIRA + OPSION BLERJE" : "RENT + BUY OPTION";
  }

  if (isRentalTransaction(transactionType)) {
    return locale === "sq" ? "ME QIRA" : "FOR RENT";
  }

  return locale === "sq" ? "PËR SHITJE" : "FOR SALE";
}

export function getLinkedListingId(
  property: Pick<
    PropertyRecord,
    "linked_rental_property_id" | "linked_sale_property_id" | "transaction_type"
  >,
) {
  return isRentalTransaction(property.transaction_type)
    ? property.linked_sale_property_id
    : property.linked_rental_property_id;
}

export function getLinkedListingNotice(
  property: Pick<
    PropertyRecord,
    "linked_rental_property_id" | "linked_sale_property_id" | "transaction_type"
  >,
  locale: Locale = defaultLocale,
) {
  const linkedId = getLinkedListingId(property);
  const targetTransactionType = getOppositeListingTransactionType(property.transaction_type);

  if (linkedId) {
    return isRentalTransaction(property.transaction_type)
      ? {
          href: `/properties/${linkedId}/edit`,
          label:
            locale === "sq"
              ? "Kjo pronë ka edhe një listim për shitje."
              : "This property also has a sale listing.",
          linkLabel: locale === "sq" ? "Hap listimin e shitjes" : "Open sale listing",
        }
      : {
          href: `/properties/${linkedId}/edit`,
          label:
            locale === "sq"
              ? "Kjo pronë ka edhe një listim me qira."
              : "This property also has a rental listing.",
          linkLabel: locale === "sq" ? "Hap listimin me qira" : "Open rental listing",
        };
  }

  return isRentalTransaction(targetTransactionType)
    ? {
        href: null,
        label:
          locale === "sq"
            ? "Mund të krijosh një listim të ndarë me qira për të njëjtin aset."
            : "You can create a separate rental listing for the same asset.",
        linkLabel: locale === "sq" ? "Krijo listim me qira" : "Create rental listing",
      }
    : {
        href: null,
        label:
          locale === "sq"
            ? "Mund të krijosh një listim të ndarë për shitje për të njëjtin aset."
            : "You can create a separate sale listing for the same asset.",
        linkLabel: locale === "sq" ? "Krijo listim për shitje" : "Create sale listing",
      };
}

export function formatPropertyPrice(
  property: Pick<
    PropertyRecord,
    "price_eur" | "price_on_request" | "rent_period" | "transaction_type" | "type"
  >,
  locale: Locale = defaultLocale,
) {
  if (property.type === "development_land" && property.price_eur == null) {
    return locale === "sq" ? "Marrëveshje me përqindje" : "Percentage agreement";
  }

  if (property.price_on_request || property.price_eur == null) {
    return isRentalTransaction(property.transaction_type)
      ? locale === "sq"
        ? "Qiraja sipas kërkesës"
        : "Rent on request"
      : locale === "sq"
        ? "Çmimi sipas kërkesës"
        : "Price on request";
  }

  const formatted = formatEuro(property.price_eur, locale);
  if (!isRentalTransaction(property.transaction_type)) {
    return formatted;
  }

  return `${formatted}/${formatRentPeriodLabel(property.rent_period, locale)}`;
}

export function isDevelopmentLand(property: PropertyRecord | PropertyType) {
  return typeof property === "string"
    ? property === "development_land"
    : property.type === "development_land";
}

export function isLandPropertyType(property: PropertyRecord | PropertyType) {
  return typeof property === "string"
    ? property === "land" || property === "development_land"
    : property.type === "land" || property.type === "development_land";
}

export function formatPropertyType(type: PropertyType, locale: Locale = defaultLocale) {
  const labels: Record<Locale, Record<PropertyType, string>> = {
    sq: {
      apartment: "Apartament",
      business: "Biznes",
      commercial: "Komerciale",
      development_project: "Projekt zhvillimi",
      hotel: "Hotel",
      parking: "Garazh / parking",
      project_unit: "Njesi projekti",
      shop: "Dyqan",
      storage: "Depo",
      warehouse: "Magazina",
      development_land: "Tokë Zhvillimi",
      house: "Shtëpi",
      land: "Tokë",
      office: "Zyrë",
      villa: "Vilë",
    },
    en: {
      apartment: "Apartment",
      business: "Business",
      commercial: "Commercial",
      development_project: "Development Project",
      development_land: "Development Land",
      house: "House",
      hotel: "Hotel",
      land: "Land",
      office: "Office",
      parking: "Garage / parking",
      project_unit: "Project unit",
      shop: "Shop",
      storage: "Storage",
      villa: "Villa",
      warehouse: "Warehouse",
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
      available: "I disponueshem",
      completed: "Përfunduar",
      contract_active: "Kontrate aktive",
      contract_drafting: "Draft Kontrate",
      contract_expiring: "Kontrate ne skadim",
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
      viewing: "Ne vizite",
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
