import assert from "node:assert/strict";
import test from "node:test";

import {
  countPhysicalAssets,
  findDuplicateAssetCandidates,
  formatPropertyPrice,
  formatTransactionBadge,
  getLinkedListingId,
  getLinkedListingNotice,
  getOppositeListingTransactionType,
  getPropertyModulePath,
  getPropertyWorkflowStatuses,
  isSameTransactionWorkflow,
  propertySchema,
} from "./properties.ts";
import {
  defaultPropertyPageSize,
  maxPropertyPageSize,
  parsePropertyFilters,
  parsePropertyPagination,
} from "./property-filters.ts";

const baseListing = {
  city: "Tirana",
  status: "draft",
  title: "Apartament testimi",
  type: "apartment",
};

test("sales and rentals expose separate workflow statuses", () => {
  const saleStatuses = getPropertyWorkflowStatuses("sale") as readonly string[];
  const rentalStatuses = getPropertyWorkflowStatuses("rent") as readonly string[];

  assert.ok(saleStatuses.includes("sold"));
  assert.equal(saleStatuses.includes("rented"), false);
  assert.ok(rentalStatuses.includes("rented"));
  assert.ok(rentalStatuses.includes("available"));
  assert.ok(rentalStatuses.includes("viewing"));
  assert.ok(rentalStatuses.includes("contract_active"));
  assert.ok(rentalStatuses.includes("contract_expiring"));
  assert.equal(rentalStatuses.includes("sold"), false);
});

test("sales listing requires sale price unless price-on-request is enabled", () => {
  const result = propertySchema.safeParse({
    ...baseListing,
    price_eur: "",
    transaction_type: "sale",
  });

  assert.equal(result.success, false);
  assert.match(result.error?.issues[0]?.message || "", /Sale price/);

  assert.equal(
    propertySchema.safeParse({
      ...baseListing,
      price_eur: "",
      price_on_request: "on",
      transaction_type: "sale",
    }).success,
    true,
  );
});

test("rental listing requires rent period and rejects sale-only status", () => {
  const missingPeriod = propertySchema.safeParse({
    ...baseListing,
    price_eur: "850",
    transaction_type: "rent",
  });

  assert.equal(missingPeriod.success, false);
  assert.match(missingPeriod.error?.issues[0]?.message || "", /Rent period/);

  const saleStatus = propertySchema.safeParse({
    ...baseListing,
    price_eur: "850",
    rent_period: "monthly",
    status: "sold",
    transaction_type: "rent",
  });

  assert.equal(saleStatus.success, false);
  assert.match(saleStatus.error?.issues[0]?.message || "", /Rental status/);
});

test("price formatting keeps sale and rental language separate", () => {
  assert.equal(
    formatTransactionBadge("sale", "en"),
    "FOR SALE",
  );
  assert.equal(
    formatTransactionBadge("rent", "en"),
    "FOR RENT",
  );
  assert.match(
    formatPropertyPrice({
      price_eur: 120000,
      price_on_request: false,
      rent_period: "monthly",
      transaction_type: "sale",
      type: "apartment",
    }, "en"),
    /€120,000/,
  );
  assert.match(
    formatPropertyPrice({
      price_eur: 850,
      price_on_request: false,
      rent_period: "monthly",
      transaction_type: "rent",
      type: "apartment",
    }),
    /\/muaj/,
  );
});

test("module paths and rental filters stay scoped", () => {
  assert.equal(getPropertyModulePath("sale"), "/sales");
  assert.equal(getPropertyModulePath("rent"), "/rentals");

  const filters = parsePropertyFilters({
    rentPeriod: "monthly",
    status: ["rented", "sold"],
  });

  assert.equal(filters.rentPeriod, "monthly");
  assert.deepEqual(filters.statuses, ["rented", "sold"]);
});

test("property pagination parses and clamps URL query params", () => {
  assert.deepEqual(parsePropertyPagination({}), {
    page: 1,
    pageSize: defaultPropertyPageSize,
  });

  assert.deepEqual(
    parsePropertyPagination({
      page: "3",
      pageSize: "48",
    }),
    {
      page: 3,
      pageSize: 48,
    },
  );

  assert.deepEqual(
    parsePropertyPagination({
      page: "0",
      pageSize: "5000",
    }),
    {
      page: 1,
      pageSize: maxPropertyPageSize,
    },
  );

  assert.deepEqual(
    parsePropertyPagination({
      page: "not-a-page",
      pageSize: "wide",
    }),
    {
      page: 1,
      pageSize: defaultPropertyPageSize,
    },
  );
});

test("linked listing helpers keep sale and rental records separate", () => {
  assert.equal(getOppositeListingTransactionType("sale"), "rent");
  assert.equal(getOppositeListingTransactionType("rent"), "sale");

  const saleListing = {
    linked_rental_property_id: "rental-1",
    linked_sale_property_id: null,
    transaction_type: "sale",
  } as const;

  const rentalListing = {
    linked_rental_property_id: null,
    linked_sale_property_id: "sale-1",
    transaction_type: "rent",
  } as const;

  assert.equal(getLinkedListingId(saleListing), "rental-1");
  assert.equal(getLinkedListingId(rentalListing), "sale-1");
  assert.match(getLinkedListingNotice(saleListing, "en").label, /rental listing/);
  assert.match(getLinkedListingNotice(rentalListing, "en").label, /sale listing/);
});

test("asset-level reporting counts linked sale and rental listings once", () => {
  assert.equal(
    countPhysicalAssets([
      { asset_id: "asset-1", id: "sale-1" },
      { asset_id: "asset-1", id: "rent-1" },
      { asset_id: "asset-2", id: "sale-2" },
      { asset_id: null, id: "legacy-1" },
    ]),
    3,
  );
});

test("duplicate asset detection suggests likely existing physical assets", () => {
  const matches = findDuplicateAssetCandidates(
    {
      address: "Rruga e Elbasanit 12",
      area_m2: 118,
      city: "Tirana",
      neighborhood: "Farke",
      type: "apartment",
    },
    [
      {
        address: "Rruga e Elbasanit 12",
        area_m2: 120,
        asset_id: "asset-1",
        city: "Tirana",
        id: "rent-1",
        linked_rental_property_id: null,
        linked_sale_property_id: null,
        neighborhood: "Farkë",
        plot_size_m2: null,
        status: "published",
        title: "Apartament me qira",
        transaction_type: "rent",
        type: "apartment",
      },
      {
        address: "Bulevardi Kryesor",
        area_m2: 60,
        asset_id: "asset-2",
        city: "Durres",
        id: "sale-2",
        linked_rental_property_id: null,
        linked_sale_property_id: null,
        neighborhood: "Qender",
        plot_size_m2: null,
        status: "published",
        title: "Dyqan ne Durres",
        transaction_type: "sale",
        type: "shop",
      },
    ],
  );

  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.candidate.id, "rent-1");
  assert.ok(matches[0]?.score && matches[0].score >= 8);
});

test("transaction workflow comparison treats rental and rent-to-own as one rental workflow", () => {
  assert.equal(isSameTransactionWorkflow("rent", "rent_to_own"), true);
  assert.equal(isSameTransactionWorkflow("sale", "rent"), false);
  assert.equal(isSameTransactionWorkflow("sale", "sale"), true);
});
