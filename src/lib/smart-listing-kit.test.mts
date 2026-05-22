import assert from "node:assert/strict";
import test from "node:test";

import {
  buildListingAiPromptPayload,
  generateMockAiDescription,
  parseAiDescriptionResponse,
} from "../modules/smart-listing-kit/smart-listing-kit.ai.ts";
import { generateListingPdfBytes } from "../modules/smart-listing-kit/smart-listing-kit.pdf.ts";
import { buildPublicListingMarketingPayload } from "../modules/smart-listing-kit/smart-listing-kit.public-payload.ts";
import { checkListingQuality } from "../modules/smart-listing-kit/smart-listing-kit.quality.ts";
import { generateWhatsAppMessage } from "../modules/smart-listing-kit/smart-listing-kit.whatsapp.ts";
import type { SmartKitPropertyRecord } from "../modules/smart-listing-kit/smart-listing-kit.types.ts";

function completeProperty(
  overrides: Partial<SmartKitPropertyRecord> = {},
): SmartKitPropertyRecord {
  const base: SmartKitPropertyRecord = {
    address: "Private exact street",
    agreement_notes: "PRIVATE_AGREEMENT",
    area_m2: 96,
    asset_id: null,
    assigned_agent: {
      agency_name: "PRONA X",
      avatar_url: null,
      email: "agent@pronax.test",
      full_name: "Agent Demo",
      id: "00000000-0000-4000-8000-000000000010",
      phone: "+355690000000",
      role: "agent",
    },
    assigned_agent_id: "00000000-0000-4000-8000-000000000010",
    available_from: null,
    bathrooms: 2,
    bedrooms: 3,
    building_coefficient: null,
    business_use_allowed: false,
    cadastral_zone: null,
    city: "Tirane",
    construction_permit_status: null,
    coordinate_confidence: "exact",
    coordinate_source: "manual",
    coordinates_updated_at: null,
    created_at: "2026-05-20T10:00:00.000Z",
    created_by: "00000000-0000-4000-8000-000000000010",
    current_land_use: null,
    deposit_eur: null,
    description:
      "Apartament i ndricuar me planimetri funksionale, prane sherbimeve kryesore dhe me akses te mire urban.",
    developer_conditions: null,
    developer_contact: "PRIVATE_DEVELOPER_CONTACT",
    developer_name: null,
    developer_offer_status: null,
    developer_offered_percentage: null,
    developer_proposed_delivery_timeline: null,
    developer_proposed_project_size: null,
    developer_proposed_unit_allocation: null,
    development_zone: null,
    estimated_apartments: null,
    estimated_commercial_units: null,
    estimated_garages: null,
    estimated_gross_buildable_area_m2: null,
    estimated_net_sellable_area_m2: null,
    estimated_parking_spaces: 1,
    furnished_state: "furnished",
    id: "00000000-0000-4000-8000-000000000001",
    land_certificate_number: null,
    landowner_requested_percentage: null,
    landowners_count: null,
    latitude: 41.3275,
    linked_rental_property_id: null,
    linked_sale_property_id: null,
    location_is_approximate: false,
    longitude: 19.8187,
    max_floors: null,
    maximum_lease_months: null,
    minimum_acceptable_percentage: null,
    minimum_lease_months: null,
    neighborhood: "Blloku",
    negotiation_status: "PRIVATE_NEGOTIATION",
    ownership_status: null,
    parcel_number: null,
    planning_permission_status: null,
    plot_size_m2: null,
    preferred_compensation_type: null,
    preferred_floor_allocation: null,
    preferred_unit_orientation: null,
    price_eur: 180000,
    price_on_request: false,
    property_media: [
      {
        alt_text: null,
        id: "00000000-0000-4000-8000-000000000101",
        public_url: "https://cdn.pronax.test/listing.jpg",
        sort_order: 1,
      },
      {
        alt_text: null,
        id: "00000000-0000-4000-8000-000000000102",
        public_url: "https://cdn.pronax.test/listing-2.jpg",
        sort_order: 2,
      },
      {
        alt_text: null,
        id: "00000000-0000-4000-8000-000000000103",
        public_url: "https://cdn.pronax.test/listing-3.jpg",
        sort_order: 3,
      },
      {
        alt_text: null,
        id: "00000000-0000-4000-8000-000000000104",
        public_url: "https://cdn.pronax.test/listing-4.jpg",
        sort_order: 4,
      },
      {
        alt_text: null,
        id: "00000000-0000-4000-8000-000000000105",
        public_url: "https://cdn.pronax.test/listing-5.jpg",
        sort_order: 5,
      },
    ],
    rent_period: null,
    road_access: null,
    slug: "apartament-demo",
    status: "published",
    sublease_allowed: false,
    title: "Apartament 3+1 ne Bllok",
    transaction_type: "sale",
    type: "apartment",
    urban_study_status: null,
    utilities_access: null,
    utilities_included: false,
    visibility: "public",
    year_built: 2018,
  };

  return { ...base, ...overrides } as SmartKitPropertyRecord;
}

test("public marketing payload excludes private and internal listing fields", () => {
  const property = {
    ...completeProperty(),
    commission: "PRIVATE_COMMISSION",
    internal_notes: "PRIVATE_INTERNAL_NOTES",
    lockbox_code: "PRIVATE_LOCKBOX",
    owner_email: "owner@example.test",
    owner_name: "Private Owner",
    owner_phone: "+355690000999",
    private_address: "PRIVATE_ADDRESS",
  } as unknown as SmartKitPropertyRecord;

  const payload = buildPublicListingMarketingPayload(property, "sq");
  const serialized = JSON.stringify(payload);

  assert.doesNotMatch(serialized, /PRIVATE_/);
  assert.doesNotMatch(serialized, /owner@example/i);
  assert.equal(payload.location.city, "Tirane");
  assert.equal(payload.agent?.name, "Agent Demo");
});

test("AI prompt payload only contains whitelisted marketing data", () => {
  const payload = buildPublicListingMarketingPayload(completeProperty(), "en");
  const promptPayload = buildListingAiPromptPayload(payload);
  const serialized = JSON.stringify(promptPayload);

  assert.doesNotMatch(serialized, /PRIVATE_AGREEMENT/);
  assert.doesNotMatch(serialized, /PRIVATE_NEGOTIATION/);
  assert.doesNotMatch(serialized, /developer_contact/);
  assert.match(serialized, /Apartament 3\+1/);
});

test("WhatsApp and PDF generation do not include forbidden internal values", () => {
  const payload = buildPublicListingMarketingPayload(completeProperty(), "sq");
  const whatsApp = generateWhatsAppMessage(payload, "sq");
  const pdf = generateListingPdfBytes(
    payload,
    {
      includeAgentContact: true,
      includePrice: true,
      includeQrCode: true,
      templateKey: "client_brochure_default",
    },
    "sq",
  ).toString("utf8");

  assert.doesNotMatch(whatsApp.message, /PRIVATE_/);
  assert.doesNotMatch(pdf, /PRIVATE_/);
  assert.match(whatsApp.shareUrl, /^https:\/\/wa\.me\/\?text=/);
  assert.match(pdf, /PRONA X CRM/);
});

test("listing quality returns ready for complete listings", () => {
  const payload = buildPublicListingMarketingPayload(
    completeProperty({
      description:
        "Apartament i ndricuar me planimetri funksionale, prane sherbimeve kryesore dhe me akses te mire urban. Kuzhina dhe zona e dites jane te organizuara per perdorim familjar. Lokacioni ofron levizje te shpejte dhe akses te lehte ne sherbime, duke e bere listimin praktik per bleres qe kerkojne banim te menjehershem.",
    }),
    "sq",
  );
  const quality = checkListingQuality(payload, "sq");

  assert.equal(quality.status, "ready");
  assert.equal(quality.required.every((item) => item.passed), true);
});

test("listing quality detects missing required fields and weak marketing data", () => {
  const payload = buildPublicListingMarketingPayload(
    completeProperty({
      area_m2: null,
      bathrooms: null,
      bedrooms: null,
      city: "",
      description: "",
      neighborhood: "",
      property_media: [],
    }),
    "en",
  );
  const quality = checkListingQuality(payload, "en");

  assert.equal(quality.status, "incomplete");
  assert.equal(quality.required.some((item) => item.key === "location" && !item.passed), true);
  assert.equal(quality.recommended.some((item) => item.key === "main_photo" && !item.passed), true);
});

test("rules-based AI description returns structured content and parser rejects invalid payloads", () => {
  const payload = buildPublicListingMarketingPayload(completeProperty(), "en");
  const generated = generateMockAiDescription(payload, {
    language: "en",
    length: "medium",
    targetAudience: "buyer",
    tone: "professional",
  });

  assert.equal(generated.title_suggestions.length, 3);
  assert.match(generated.full_description, /PRONA X/);
  assert.equal(parseAiDescriptionResponse(generated)?.full_description, generated.full_description);
  assert.equal(parseAiDescriptionResponse({ full_description: "missing shape" }), null);
});
