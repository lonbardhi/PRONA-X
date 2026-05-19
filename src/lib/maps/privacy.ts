import { deriveDisplayCoordinate } from "./coordinates.ts";
import type { LatLng } from "./types.ts";

export type CoordinatePrivacyInput = {
  canViewExact: boolean;
  id: string;
  latitude: unknown;
  location_is_approximate?: boolean | null;
  longitude: unknown;
};

export function getDisplaySafeCoordinate(input: CoordinatePrivacyInput): LatLng | null {
  return deriveDisplayCoordinate({
    canViewExact: input.canViewExact,
    id: input.id,
    isApproximate: Boolean(input.location_is_approximate),
    latitude: input.latitude,
    longitude: input.longitude,
  });
}

export function omitExactCoordinatesForMapPayload<T extends CoordinatePrivacyInput>(
  property: T,
): Omit<T, "latitude" | "longitude"> & { position: LatLng | null } {
  const { latitude, longitude, ...safeProperty } = property;
  void latitude;
  void longitude;

  return {
    ...safeProperty,
    position: getDisplaySafeCoordinate(property),
  };
}
