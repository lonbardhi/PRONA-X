import assert from "node:assert/strict";
import test from "node:test";

import {
  detectPossiblySwappedLatLng,
  deriveDisplayCoordinate,
  isCoordinateInSupportedRegion,
  isValidLatitude,
  isValidLongitude,
  parseCoordinate,
} from "./maps/coordinates.ts";
import { omitExactCoordinatesForMapPayload } from "./maps/privacy.ts";

test("coordinate parsing and validation reject unsafe values", () => {
  assert.equal(parseCoordinate("41,3275"), 41.3275);
  assert.equal(parseCoordinate(""), null);
  assert.equal(parseCoordinate("abc"), null);
  assert.equal(isValidLatitude(41.3275), true);
  assert.equal(isValidLatitude(999), false);
  assert.equal(isValidLongitude(19.8189), true);
  assert.equal(isValidLongitude(Number.POSITIVE_INFINITY), false);
});

test("coordinate helpers identify Albania bounds and swapped inputs", () => {
  assert.equal(isCoordinateInSupportedRegion(41.3275, 19.8189), true);
  assert.equal(isCoordinateInSupportedRegion(51.5072, -0.1276), false);
  assert.equal(detectPossiblySwappedLatLng(19.8189, 41.3275), true);
});

test("approximate display coordinates are stable and hide exact values", () => {
  const exact = deriveDisplayCoordinate({
    canViewExact: true,
    id: "property-1",
    isApproximate: true,
    latitude: 41.3275123,
    longitude: 19.8189123,
  });
  const publicFirst = deriveDisplayCoordinate({
    canViewExact: false,
    id: "property-1",
    isApproximate: true,
    latitude: 41.3275123,
    longitude: 19.8189123,
  });
  const publicSecond = deriveDisplayCoordinate({
    canViewExact: false,
    id: "property-1",
    isApproximate: true,
    latitude: 41.3275123,
    longitude: 19.8189123,
  });

  assert.deepEqual(exact, { lat: 41.3275123, lng: 19.8189123 });
  assert.deepEqual(publicFirst, publicSecond);
  assert.notDeepEqual(publicFirst, exact);
});

test("map payload helper removes exact coordinate fields", () => {
  const safe = omitExactCoordinatesForMapPayload({
    canViewExact: false,
    id: "property-2",
    latitude: 41.3275123,
    location_is_approximate: true,
    longitude: 19.8189123,
    title: "Private listing",
  });

  assert.equal("latitude" in safe, false);
  assert.equal("longitude" in safe, false);
  assert.equal(safe.title, "Private listing");
  assert.ok(safe.position);
});
