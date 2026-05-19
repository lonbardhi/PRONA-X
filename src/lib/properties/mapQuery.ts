import { getDisplaySafeCoordinate } from "@/lib/maps/privacy";
import type { PropertyMapPoint } from "@/lib/maps/types";
import type {
  PropertyStatus,
  PropertyTransactionType,
  PropertyType,
  RentPeriod,
} from "@/lib/properties";
import { isRentalTransaction } from "@/lib/properties";

export const propertyMapSelect =
  "id,title,slug,type,transaction_type,status,city,neighborhood,price_eur,price_on_request,rent_period,bedrooms,bathrooms,area_m2,latitude,longitude,location_is_approximate,property_media(id,public_url,alt_text,sort_order)";

type PropertyMapMediaRow = {
  public_url: string | null;
  sort_order: number | null;
};

export type PropertyMapRow = {
  area_m2: number | null;
  bathrooms: number | null;
  bedrooms: number | null;
  city: string | null;
  id: string;
  latitude: number | string | null;
  location_is_approximate: boolean | null;
  longitude: number | string | null;
  neighborhood: string | null;
  price_eur: number | null;
  price_on_request: boolean | null;
  property_media?: PropertyMapMediaRow[] | null;
  rent_period: RentPeriod | null;
  slug: string | null;
  status: PropertyStatus;
  title: string | null;
  transaction_type: PropertyTransactionType;
  type: PropertyType;
};

function getMarkerTone(row: PropertyMapRow): PropertyMapPoint["markerTone"] {
  if (row.status === "archived" || row.status === "sold" || row.status === "rented") {
    return "inactive";
  }

  if (row.type === "development_land" || row.type === "land") {
    return "development";
  }

  return isRentalTransaction(row.transaction_type) ? "rent" : "sale";
}

function getThumbnailUrl(media: PropertyMapMediaRow[] | null | undefined) {
  return (media || [])
    .slice()
    .sort((first, second) => (first.sort_order || 0) - (second.sort_order || 0))
    .find((item) => Boolean(item.public_url))?.public_url || null;
}

export function toPropertyMapPoints({
  canViewExact,
  rows,
}: {
  canViewExact: boolean;
  rows: PropertyMapRow[];
}) {
  return rows.reduce<PropertyMapPoint[]>((points, row) => {
    const position = getDisplaySafeCoordinate({
      canViewExact,
      id: row.id,
      latitude: row.latitude,
      location_is_approximate: row.location_is_approximate,
      longitude: row.longitude,
    });

    if (!position) {
      return points;
    }

    points.push({
      area_m2: row.area_m2,
      bathrooms: row.bathrooms,
      bedrooms: row.bedrooms,
      city: row.city || "PRONA X",
      currency: "EUR",
      detailHref: canViewExact ? `/properties/${row.id}/edit` : `/properties/${row.id}`,
      id: row.id,
      location_is_approximate: Boolean(row.location_is_approximate),
      markerTone: getMarkerTone(row),
      neighborhood: row.neighborhood,
      position,
      price_eur: row.price_eur,
      price_on_request: row.price_on_request,
      rent_period: row.rent_period,
      status: row.status,
      thumbnail_url: getThumbnailUrl(row.property_media),
      title: row.title || "Untitled property",
      transaction_type: row.transaction_type,
      type: row.type,
    });

    return points;
  }, []);
}
