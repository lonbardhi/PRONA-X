import assert from "node:assert/strict";
import test from "node:test";

import {
  getAlbaniaLocationFilterValues,
  getAlbaniaLocationOptions,
} from "./albania-locations.ts";

test("Albania location options include cities, towns, and smaller municipalities", () => {
  const options = getAlbaniaLocationOptions();

  assert.ok(options.length >= 80);
  assert.ok(options.includes("Bajram Curri"));
  assert.ok(options.includes("Bajzë"));
  assert.ok(options.includes("Fushë-Krujë"));
  assert.ok(options.includes("Krrabë"));
  assert.ok(options.includes("Pustec"));
  assert.ok(options.includes("Tiranë"));
  assert.ok(options.includes("Vlorë"));
});

test("Albania location options collapse existing duplicate city spellings", () => {
  const options = getAlbaniaLocationOptions([
    "Durres",
    "SARANDE",
    "Tirana",
    "Tirane",
    "TIRANE",
    "Custom Area",
  ]);

  assert.ok(options.includes("Durrës"));
  assert.ok(options.includes("Sarandë"));
  assert.ok(options.includes("Tiranë"));
  assert.ok(options.includes("Custom Area"));
  assert.equal(options.includes("Durres"), false);
  assert.equal(options.includes("SARANDE"), false);
  assert.equal(options.includes("Tirane"), false);
  assert.equal(options.filter((option) => option === "Tiranë").length, 1);
});

test("Albania location filters match common stored variants", () => {
  const tiranaValues = getAlbaniaLocationFilterValues("Tiranë");
  const durresValues = getAlbaniaLocationFilterValues("Durrës");

  assert.ok(tiranaValues.includes("Tirana"));
  assert.ok(tiranaValues.includes("Tirane"));
  assert.ok(tiranaValues.includes("TIRANE"));
  assert.ok(durresValues.includes("Durres"));
  assert.ok(durresValues.includes("DURRES"));
});
