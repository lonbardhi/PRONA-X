import type {
  PropertyStatus,
  PropertyTransactionType,
  PropertyType,
  RentPeriod,
} from "@/lib/properties";

export type MapProviderName = "leaflet" | "maplibre";

export type TileSourceType =
  | "osm-raster"
  | "custom-raster"
  | "pmtiles-raster"
  | "pmtiles-vector";

export type CoordinatePrivacyMode = "exact" | "approximate";

export type CoordinateConfidence =
  | "exact"
  | "high"
  | "medium"
  | "low"
  | "unknown";

export type CoordinateSource =
  | "manual"
  | "map_picker"
  | "city_centroid"
  | "address_geocode"
  | "imported_csv"
  | "backfill"
  | "unknown";

export type LatLng = {
  lat: number;
  lng: number;
};

export type TileSourceConfig = {
  attribution: string;
  bounds?: [[number, number], [number, number]];
  maxZoom: number;
  minZoom: number;
  notes?: string;
  requiresClientOnly: boolean;
  type: TileSourceType;
  url: string;
};

export type MapViewport = {
  bounds?: {
    north: number;
    east: number;
    south: number;
    west: number;
  };
  center: LatLng;
  zoom: number;
};

export type PropertyMapPoint = {
  area_m2: number | null;
  bathrooms: number | null;
  bedrooms: number | null;
  city: string;
  currency: "EUR";
  detailHref: string;
  id: string;
  location_is_approximate: boolean;
  markerTone: "sale" | "rent" | "development" | "inactive";
  neighborhood: string | null;
  position: LatLng;
  price_eur: number | null;
  price_on_request: boolean | null;
  rent_period: RentPeriod | null;
  status: PropertyStatus;
  thumbnail_url: string | null;
  title: string;
  transaction_type: PropertyTransactionType;
  type: PropertyType;
};

export type BoundaryFeature = {
  geometry: unknown;
  properties: Record<string, unknown>;
  type: "Feature";
};
