import { NextResponse, type NextRequest } from "next/server";

import { getAlbaniaLocationFilterValues } from "@/lib/albania-locations";
import {
  getIlikeSearchTerm,
  parsePropertyFilters,
  type PropertySearchParams,
} from "@/lib/property-filters";
import {
  propertyMapSelect,
  toPropertyMapPoints,
  type PropertyMapRow,
} from "@/lib/properties/mapQuery";
import { isOperatorRole, requireApprovedUser } from "@/lib/supabase/server";

function searchParamsToRecord(searchParams: URLSearchParams): PropertySearchParams {
  const params: PropertySearchParams = {};

  for (const [key, value] of searchParams.entries()) {
    const existing = params[key];

    if (existing == null) {
      params[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      params[key] = [existing, value];
    }
  }

  return params;
}

export async function GET(request: NextRequest) {
  const { profile, supabase } = await requireApprovedUser();
  const canViewExact = isOperatorRole(profile.role);
  const filters = parsePropertyFilters(searchParamsToRecord(request.nextUrl.searchParams));
  const propertyModule =
    request.nextUrl.searchParams.get("module") === "rentals" ? "rentals" : "sales";

  let query = supabase
    .from("properties")
    .select(propertyMapSelect)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .limit(1000);

  query =
    propertyModule === "rentals"
      ? query.in("transaction_type", ["rent", "rent_to_own"])
      : query.eq("transaction_type", "sale");

  const searchTerm = getIlikeSearchTerm(filters.q);
  if (searchTerm) {
    const pattern = `%${searchTerm}%`;
    query = query.or(`title.ilike.${pattern},city.ilike.${pattern},neighborhood.ilike.${pattern}`);
  }

  if (filters.types.length === 1) {
    query = query.eq("type", filters.types[0]);
  } else if (filters.types.length > 1) {
    query = query.in("type", filters.types);
  }

  if (filters.statuses.length === 1) {
    query = query.eq("status", filters.statuses[0]);
  } else if (filters.statuses.length > 1) {
    query = query.in("status", filters.statuses);
  }

  if (filters.city) {
    const locationFilterValues = getAlbaniaLocationFilterValues(filters.city);
    query =
      locationFilterValues.length > 1
        ? query.in("city", locationFilterValues)
        : query.eq("city", filters.city);
  }

  if (filters.minPrice && filters.maxPrice) {
    query = query.or(
      `and(price_eur.gte.${filters.minPrice},price_eur.lte.${filters.maxPrice}),type.eq.development_land`,
    );
  } else if (filters.minPrice) {
    query = query.or(`price_eur.gte.${filters.minPrice},type.eq.development_land`);
  } else if (filters.maxPrice) {
    query = query.or(`price_eur.lte.${filters.maxPrice},type.eq.development_land`);
  }

  if (filters.minBedrooms) {
    query = query.gte("bedrooms", Number(filters.minBedrooms));
  }

  if (propertyModule === "rentals" && filters.rentPeriod) {
    query = query.eq("rent_period", filters.rentPeriod);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const points = toPropertyMapPoints({
    canViewExact,
    rows: (data || []) as unknown as PropertyMapRow[],
  });

  return NextResponse.json({
    meta: {
      excludedMissingCoordinates: Math.max(0, (data || []).length - points.length),
      resultCap: 1000,
    },
    points,
  });
}
