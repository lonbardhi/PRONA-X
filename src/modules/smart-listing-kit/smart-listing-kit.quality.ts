import type { Locale } from "../../lib/i18n.ts";

import type {
  PublicMarketingListingPayload,
  QualityCheckItem,
  QualityCheckResponse,
} from "./smart-listing-kit.types.ts";

function item(
  key: string,
  label: string,
  passed: boolean,
  message: string,
): QualityCheckItem {
  return { key, label, message, passed };
}

function hasUsefulDescription(description: string | null, minLength: number) {
  return Boolean(description && description.trim().length >= minLength);
}

export function checkListingQuality(
  listing: PublicMarketingListingPayload,
  locale: Locale = "sq",
): QualityCheckResponse {
  const required: QualityCheckItem[] = [
    item(
      "title",
      locale === "sq" ? "Titulli" : "Title",
      listing.title.trim().length >= 3,
      locale === "sq" ? "Titulli duhet të jetë i qartë." : "Title should be clear.",
    ),
    item(
      "price",
      locale === "sq" ? "Çmimi" : "Price",
      Boolean(listing.price_label),
      locale === "sq" ? "Shto çmim ose shëno çmimin sipas kërkesës." : "Add a price or price-on-request label.",
    ),
    item(
      "property_type",
      locale === "sq" ? "Lloji i pronës" : "Property type",
      Boolean(listing.property_type),
      locale === "sq" ? "Zgjidh llojin e pronës." : "Choose a property type.",
    ),
    item(
      "location",
      locale === "sq" ? "Lokacioni" : "Location",
      Boolean(listing.location.city || listing.location.neighborhood),
      locale === "sq" ? "Shto qytetin ose zonën." : "Add city or neighborhood.",
    ),
    item(
      "area",
      locale === "sq" ? "Sipërfaqja" : "Area",
      Boolean(listing.area_m2 && listing.area_m2 > 0),
      locale === "sq" ? "Shto sipërfaqen në m2." : "Add area in m2.",
    ),
  ];

  const lowerType = listing.property_type.toLowerCase();
  const bedroomsRelevant =
    !lowerType.includes("tok") &&
    !lowerType.includes("land") &&
    !lowerType.includes("parking") &&
    !lowerType.includes("garazh");

  if (bedroomsRelevant) {
    required.push(
      item(
        "bedrooms",
        locale === "sq" ? "Dhomat" : "Bedrooms",
        listing.bedrooms != null,
        locale === "sq" ? "Shto numrin e dhomave kur është relevante." : "Add bedroom count when relevant.",
      ),
      item(
        "bathrooms",
        locale === "sq" ? "Banjo" : "Bathrooms",
        listing.bathrooms != null,
        locale === "sq" ? "Shto numrin e banjove kur është relevante." : "Add bathroom count when relevant.",
      ),
    );
  }

  const recommended: QualityCheckItem[] = [
    item(
      "main_photo",
      locale === "sq" ? "Foto kryesore" : "Main photo",
      listing.photos.length >= 1,
      locale === "sq" ? "Shto të paktën një foto." : "Add at least one photo.",
    ),
    item(
      "photo_count",
      locale === "sq" ? "5+ foto" : "5+ photos",
      listing.photos.length >= 5,
      locale === "sq" ? "Syno 5 ose më shumë foto për klientët." : "Aim for 5 or more client-facing photos.",
    ),
    item(
      "description",
      locale === "sq" ? "Përshkrimi" : "Description",
      Boolean(listing.description),
      locale === "sq" ? "Shto përshkrim publik." : "Add a public description.",
    ),
    item(
      "agent_contact",
      locale === "sq" ? "Kontakt agjenti" : "Agent contact",
      Boolean(listing.agent?.phone || listing.agent?.email),
      locale === "sq" ? "Shto telefon ose email publik të agjentit." : "Add public agent phone or email.",
    ),
  ];

  const marketing_quality: QualityCheckItem[] = [
    item(
      "description_length",
      locale === "sq" ? "Përshkrim i plotë" : "Complete description",
      hasUsefulDescription(listing.description, 300),
      locale === "sq"
        ? "Përshkrimi duhet të jetë rreth 300+ karaktere për marketing më të mirë."
        : "Description should be around 300+ characters for stronger marketing.",
    ),
    item(
      "highlights",
      locale === "sq" ? "Veçori" : "Highlights",
      listing.features.length >= 2,
      locale === "sq" ? "Shto veçori publike që ndihmojnë prezantimin." : "Add public features that support the pitch.",
    ),
    item(
      "public_url",
      locale === "sq" ? "URL publike" : "Public URL",
      Boolean(listing.public_url),
      locale === "sq" ? "Sigurohu që linku publik është gati për shpërndarje." : "Ensure the public link is ready to share.",
    ),
  ];

  const requiredFailed = required.some((check) => !check.passed);
  const attentionFailed = [...recommended, ...marketing_quality].some(
    (check) => !check.passed,
  );

  return {
    marketing_quality,
    recommended,
    required,
    status: requiredFailed ? "incomplete" : attentionFailed ? "needs_attention" : "ready",
  };
}
