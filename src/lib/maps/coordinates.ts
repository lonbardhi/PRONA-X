import type { LatLng } from "@/lib/maps/types";

export const albaniaMapBounds = {
  north: 42.8,
  east: 21.2,
  south: 39.3,
  west: 18.0,
} as const;

export const defaultAlbaniaMapCenter: LatLng = {
  lat: 41.1533,
  lng: 20.1683,
};

export function isValidLatitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

export function parseCoordinate(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(",", ".");

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeCoordinate(value: unknown, decimals = 7) {
  const parsed = parseCoordinate(value);

  if (parsed == null) {
    return null;
  }

  const factor = 10 ** decimals;

  return Math.round(parsed * factor) / factor;
}

export function detectPossiblySwappedLatLng(lat: unknown, lng: unknown) {
  const parsedLat = parseCoordinate(lat);
  const parsedLng = parseCoordinate(lng);

  if (parsedLat == null || parsedLng == null) {
    return false;
  }

  return (
    isValidLatitude(parsedLng) &&
    isValidLongitude(parsedLat) &&
    parsedLat >= albaniaMapBounds.west &&
    parsedLat <= albaniaMapBounds.east &&
    parsedLng >= albaniaMapBounds.south &&
    parsedLng <= albaniaMapBounds.north
  );
}

export function isCoordinateInSupportedRegion(lat: unknown, lng: unknown) {
  const parsedLat = parseCoordinate(lat);
  const parsedLng = parseCoordinate(lng);

  if (!isValidLatitude(parsedLat) || !isValidLongitude(parsedLng)) {
    return false;
  }

  return (
    parsedLat >= albaniaMapBounds.south &&
    parsedLat <= albaniaMapBounds.north &&
    parsedLng >= albaniaMapBounds.west &&
    parsedLng <= albaniaMapBounds.east
  );
}

export function roundCoordinateForApproximateDisplay(value: number, decimals = 3) {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

function deterministicOffset(seed: string, axis: "lat" | "lng") {
  let hash = axis === "lat" ? 17 : 31;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 33 + seed.charCodeAt(index)) % 9973;
  }

  return ((hash / 9973) - 0.5) * 0.004;
}

export function deriveDisplayCoordinate({
  canViewExact,
  id,
  isApproximate,
  latitude,
  longitude,
}: {
  canViewExact: boolean;
  id: string;
  isApproximate: boolean;
  latitude: unknown;
  longitude: unknown;
}) {
  const lat = normalizeCoordinate(latitude);
  const lng = normalizeCoordinate(longitude);

  if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
    return null;
  }

  if (!isApproximate || canViewExact) {
    return { lat, lng } satisfies LatLng;
  }

  return {
    lat: normalizeCoordinate(
      roundCoordinateForApproximateDisplay(lat) + deterministicOffset(id, "lat"),
      5,
    ) as number,
    lng: normalizeCoordinate(
      roundCoordinateForApproximateDisplay(lng) + deterministicOffset(id, "lng"),
      5,
    ) as number,
  } satisfies LatLng;
}

export function calculateBoundsForPoints(points: LatLng[]) {
  if (points.length === 0) {
    return null;
  }

  return points.reduce(
    (bounds, point) => ({
      east: Math.max(bounds.east, point.lng),
      north: Math.max(bounds.north, point.lat),
      south: Math.min(bounds.south, point.lat),
      west: Math.min(bounds.west, point.lng),
    }),
    {
      east: points[0].lng,
      north: points[0].lat,
      south: points[0].lat,
      west: points[0].lng,
    },
  );
}
