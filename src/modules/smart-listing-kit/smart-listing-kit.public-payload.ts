import type { Locale } from "../../lib/i18n.ts";
import {
  formatPropertyPrice,
  formatPropertyType,
  formatTransactionBadge,
  isLandPropertyType,
} from "../../lib/properties.ts";

import type {
  PublicMarketingListingPayload,
  SmartKitPropertyRecord,
} from "./smart-listing-kit.types.ts";

export const forbiddenMarketingFieldNames = [
  "owner_name",
  "owner_phone",
  "owner_email",
  "private_notes",
  "internal_notes",
  "commission",
  "lockbox_code",
  "private_address",
  "internal_valuation",
  "negotiation_notes",
  "agreement_notes",
  "developer_contact",
] as const;

function cleanText(value: string | null | undefined, maxLength = 1800) {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanUrl(value: string | null | undefined) {
  const url = cleanText(value, 900);
  if (!url) {
    return null;
  }

  if (url.startsWith("/") || url.startsWith("https://") || url.startsWith("http://")) {
    return url;
  }

  return null;
}

function getPublicSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "";
}

export function getPublicListingUrl(property: Pick<SmartKitPropertyRecord, "id" | "slug">) {
  const baseUrl = getPublicSiteUrl();
  const path = `/properties/${property.slug || property.id}`;

  return baseUrl ? `${baseUrl}${path}` : path;
}

function getFeatureLabels(property: SmartKitPropertyRecord, locale: Locale) {
  const features: string[] = [];

  if (property.furnished_state && property.furnished_state !== "unknown") {
    const furnishedLabels: Record<string, Record<Locale, string>> = {
      furnished: { en: "Furnished", sq: "E mobiluar" },
      partially_furnished: { en: "Partially furnished", sq: "Pjesërisht e mobiluar" },
      unfurnished: { en: "Unfurnished", sq: "E pamobiluar" },
    };
    features.push(furnishedLabels[property.furnished_state]?.[locale] || property.furnished_state);
  }

  if (property.utilities_included) {
    features.push(locale === "sq" ? "Shërbimet e përfshira" : "Utilities included");
  }

  if (property.business_use_allowed) {
    features.push(locale === "sq" ? "E përshtatshme për biznes" : "Business use allowed");
  }

  if (property.road_access) {
    features.push(
      locale === "sq"
        ? `Akses rruge: ${cleanText(property.road_access, 80)}`
        : `Road access: ${cleanText(property.road_access, 80)}`,
    );
  }

  if (property.utilities_access) {
    features.push(
      locale === "sq"
        ? `Infrastrukturë: ${cleanText(property.utilities_access, 80)}`
        : `Utilities access: ${cleanText(property.utilities_access, 80)}`,
    );
  }

  if (property.year_built) {
    features.push(
      locale === "sq"
        ? `Viti i ndërtimit: ${property.year_built}`
        : `Year built: ${property.year_built}`,
    );
  }

  if (property.estimated_parking_spaces) {
    features.push(
      locale === "sq"
        ? `${property.estimated_parking_spaces} vende parkimi të vlerësuara`
        : `${property.estimated_parking_spaces} estimated parking spaces`,
    );
  }

  return features.slice(0, 10);
}

export function buildPublicListingMarketingPayload(
  property: SmartKitPropertyRecord,
  locale: Locale = "sq",
): PublicMarketingListingPayload {
  const photos = (property.property_media || [])
    .map((media) => cleanUrl(media.public_url))
    .filter((url): url is string => Boolean(url))
    .slice(0, 8);

  const description = cleanText(property.description, 5000);

  return {
    agent: property.assigned_agent
      ? {
          email: cleanText(property.assigned_agent.email, 180) || null,
          name: cleanText(property.assigned_agent.full_name, 180) || null,
          phone: cleanText(property.assigned_agent.phone, 80) || null,
        }
      : null,
    area_m2: property.area_m2 ?? property.plot_size_m2 ?? null,
    bathrooms: isLandPropertyType(property) ? null : property.bathrooms,
    bedrooms: isLandPropertyType(property) ? null : property.bedrooms,
    currency: "EUR",
    description: description || null,
    features: getFeatureLabels(property, locale),
    id: property.slug || property.id,
    listing_status: formatTransactionBadge(property.transaction_type, locale),
    location: {
      city: cleanText(property.city, 120) || null,
      neighborhood: cleanText(property.neighborhood, 120) || null,
    },
    photos,
    price_eur: property.price_on_request ? null : property.price_eur,
    price_label: formatPropertyPrice(property, locale),
    property_type: formatPropertyType(property.type, locale),
    public_url: getPublicListingUrl(property),
    title: cleanText(property.title, 220) || (locale === "sq" ? "Pronë PRONA X" : "PRONA X listing"),
    transaction_type: property.transaction_type,
    year_built: property.year_built,
  };
}

export function assertNoForbiddenMarketingFields(value: unknown) {
  const serialized = JSON.stringify(value).toLowerCase();

  return forbiddenMarketingFieldNames.every((field) => !serialized.includes(field));
}
