import type { Locale } from "./i18n.ts";
import {
  getPropertyWorkflowStatuses,
  propertyTypes,
  rentPeriods,
  type PropertyModule,
  type PropertyStatus,
  type PropertyType,
  type RentPeriod,
} from "./properties.ts";

export const propertySortOptions = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price low to high" },
  { value: "price_desc", label: "Price high to low" },
  { value: "area_desc", label: "Largest area" },
  { value: "status", label: "Status" },
] as const;

export type PropertySort = (typeof propertySortOptions)[number]["value"];

export function getPropertySortOptions(
  locale: Locale,
  module: PropertyModule = "sales",
) {
  if (locale === "sq") {
    const priceLabel = module === "rentals" ? "Qiraja" : "Çmimi";

    return [
      { value: "newest", label: "Më të rejat" },
      { value: "price_asc", label: `${priceLabel} nga i ulëti` },
      { value: "price_desc", label: `${priceLabel} nga i larti` },
      { value: "area_desc", label: "Sipërfaqja më e madhe" },
      { value: "status", label: "Statusi" },
    ] as const;
  }

  if (module === "rentals") {
    return [
      { value: "newest", label: "Newest" },
      { value: "price_asc", label: "Rent low to high" },
      { value: "price_desc", label: "Rent high to low" },
      { value: "area_desc", label: "Largest area" },
      { value: "status", label: "Status" },
    ] as const;
  }

  return propertySortOptions;
}

export type PropertyFilters = {
  q: string;
  types: PropertyType[];
  statuses: PropertyStatus[];
  city: string;
  minPrice: string;
  maxPrice: string;
  minBedrooms: string;
  rentPeriod: "" | RentPeriod;
  sort: PropertySort;
};

export type PropertySearchParams = Record<string, string | string[] | undefined>;

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function getParamList(value: string | string[] | undefined) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function isPropertyType(value: string): value is PropertyType {
  return propertyTypes.includes(value as PropertyType);
}

function isPropertyStatus(value: string): value is PropertyStatus {
  return (
    getPropertyWorkflowStatuses("sale").includes(value as never) ||
    getPropertyWorkflowStatuses("rent").includes(value as never)
  );
}

function isPropertySort(value: string): value is PropertySort {
  return propertySortOptions.some((option) => option.value === value);
}

function isRentPeriod(value: string): value is RentPeriod {
  return rentPeriods.includes(value as RentPeriod);
}

function cleanNumberParam(value: string) {
  return /^\d+(\.\d+)?$/.test(value) ? value : "";
}

export function parsePropertyFilters(params: PropertySearchParams): PropertyFilters {
  const sort = getFirstParam(params.sort);
  const rentPeriod = getFirstParam(params.rentPeriod);

  return {
    q: getFirstParam(params.q).trim().slice(0, 96),
    types: getParamList(params.type).filter(isPropertyType),
    statuses: getParamList(params.status).filter(isPropertyStatus),
    city: getFirstParam(params.city).trim().slice(0, 72),
    minPrice: cleanNumberParam(getFirstParam(params.minPrice)),
    maxPrice: cleanNumberParam(getFirstParam(params.maxPrice)),
    minBedrooms: cleanNumberParam(getFirstParam(params.minBedrooms)),
    rentPeriod: isRentPeriod(rentPeriod) ? rentPeriod : "",
    sort: isPropertySort(sort) ? sort : "newest",
  };
}

export function getActivePropertyFilterCount(filters: PropertyFilters) {
  return [
    filters.q,
    filters.types.length ? "types" : "",
    filters.statuses.length ? "statuses" : "",
    filters.city,
    filters.minPrice,
    filters.maxPrice,
    filters.minBedrooms,
    filters.rentPeriod,
  ].filter(Boolean).length;
}

export function getIlikeSearchTerm(value: string) {
  return value.replace(/[%(),]/g, " ").replace(/\s+/g, " ").trim();
}
