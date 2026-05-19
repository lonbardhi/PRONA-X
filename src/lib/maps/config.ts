import {
  defaultAlbaniaMapCenter,
  normalizeCoordinate,
} from "@/lib/maps/coordinates";
import type { MapProviderName, TileSourceConfig, TileSourceType } from "@/lib/maps/types";

function getPublicEnv(name: string, fallback: string) {
  return process.env[name] || fallback;
}

function getPublicNumberEnv(name: string, fallback: number) {
  const parsed = normalizeCoordinate(process.env[name]);

  return parsed == null ? fallback : parsed;
}

export function getMapProviderName(): MapProviderName {
  const value = getPublicEnv("NEXT_PUBLIC_MAP_PROVIDER", "leaflet");

  return value === "maplibre" ? "maplibre" : "leaflet";
}

export function getTileSourceConfig(): TileSourceConfig {
  const type = getPublicEnv("NEXT_PUBLIC_TILE_SOURCE", "osm-raster") as TileSourceType;
  const fallbackOsmUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  if (type === "custom-raster") {
    return {
      attribution: getPublicEnv("NEXT_PUBLIC_TILE_ATTRIBUTION", ""),
      maxZoom: getPublicNumberEnv("NEXT_PUBLIC_MAP_MAX_ZOOM", 19),
      minZoom: getPublicNumberEnv("NEXT_PUBLIC_MAP_MIN_ZOOM", 6),
      notes: "Custom raster tiles. Keep attribution and licensing visible.",
      requiresClientOnly: true,
      type,
      url: getPublicEnv("NEXT_PUBLIC_CUSTOM_TILE_URL", fallbackOsmUrl),
    };
  }

  if (type === "pmtiles-raster" || type === "pmtiles-vector") {
    return {
      attribution: getPublicEnv(
        "NEXT_PUBLIC_TILE_ATTRIBUTION",
        "© OpenStreetMap contributors",
      ),
      maxZoom: getPublicNumberEnv("NEXT_PUBLIC_MAP_MAX_ZOOM", 14),
      minZoom: getPublicNumberEnv("NEXT_PUBLIC_MAP_MIN_ZOOM", 6),
      notes:
        "Phase 2 placeholder. Use Albania/regional PMTiles with range requests and CORS enabled.",
      requiresClientOnly: true,
      type,
      url: getPublicEnv("NEXT_PUBLIC_PM_TILES_URL", ""),
    };
  }

  return {
    attribution: getPublicEnv(
      "NEXT_PUBLIC_TILE_ATTRIBUTION",
      "© OpenStreetMap contributors",
    ),
    maxZoom: getPublicNumberEnv("NEXT_PUBLIC_MAP_MAX_ZOOM", 19),
    minZoom: getPublicNumberEnv("NEXT_PUBLIC_MAP_MIN_ZOOM", 6),
    notes:
      "Temporary MVP source. Production should move to self-hosted Albania/regional OSM-derived tiles.",
    requiresClientOnly: true,
    type: "osm-raster",
    url: getPublicEnv("NEXT_PUBLIC_OSM_TILE_URL", fallbackOsmUrl),
  };
}

export function getDefaultMapViewport() {
  return {
    center: {
      lat: getPublicNumberEnv(
        "NEXT_PUBLIC_MAP_DEFAULT_CENTER_LAT",
        defaultAlbaniaMapCenter.lat,
      ),
      lng: getPublicNumberEnv(
        "NEXT_PUBLIC_MAP_DEFAULT_CENTER_LNG",
        defaultAlbaniaMapCenter.lng,
      ),
    },
    zoom: getPublicNumberEnv("NEXT_PUBLIC_MAP_DEFAULT_ZOOM", 7),
  };
}
