import type { Locale } from "../../lib/i18n.ts";

import type {
  PublicMarketingListingPayload,
  WhatsAppMessageResponse,
} from "./smart-listing-kit.types.ts";

function compact(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => String(part || "").trim())
    .filter(Boolean);
}

export function generateWhatsAppMessage(
  listing: PublicMarketingListingPayload,
  locale: Locale = "sq",
): WhatsAppMessageResponse {
  const location = compact([
    listing.location.neighborhood,
    listing.location.city,
  ]).join(", ");
  const facts = compact([
    listing.property_type,
    listing.area_m2 ? `${listing.area_m2} m2` : null,
    listing.bedrooms != null ? `${listing.bedrooms} ${locale === "sq" ? "dhoma" : "bedrooms"}` : null,
    location,
  ]).join(" · ");
  const publicUrl = listing.public_url || "";

  const message =
    locale === "sq"
      ? compact([
          `Përshëndetje, po ndaj një pronë që mund t'ju interesojë: ${listing.title}.`,
          facts,
          listing.price_label,
          publicUrl ? `Detajet: ${publicUrl}` : "Mund t'ju dërgoj detajet e plota direkt.",
        ]).join(" ")
      : compact([
          `Hello, I am sharing a property that may interest you: ${listing.title}.`,
          facts,
          listing.price_label,
          publicUrl ? `Details: ${publicUrl}` : "I can send the full details directly.",
        ]).join(" ");

  const trimmed = message.slice(0, 1200);

  return {
    message: trimmed,
    shareUrl: `https://wa.me/?text=${encodeURIComponent(trimmed)}`,
  };
}
