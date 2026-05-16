import assert from "node:assert/strict";
import test from "node:test";

import {
  createPropertyMediaStoragePath,
  getPropertyMediaMimeType,
  propertyMediaMaxFiles,
  validatePropertyMediaFile,
  validatePropertyMediaFileCount,
} from "./property-media.ts";

function file(name: string, type: string, size = 1024) {
  return { name, size, type } as File;
}

test("accepts valid uppercase image extensions", () => {
  const media = file("PHOTO.JPG", "image/jpeg");

  assert.equal(getPropertyMediaMimeType(media), "image/jpeg");
  assert.equal(validatePropertyMediaFile(media), null);
});

test("rejects unsupported media formats", () => {
  const error = validatePropertyMediaFile(file("virus.exe", "application/x-msdownload"));

  assert.match(error || "", /not a supported media file/);
});

test("rejects MIME and extension mismatches", () => {
  const error = validatePropertyMediaFile(file("photo.jpg", "text/plain"));

  assert.match(error || "", /not a supported media file/);
});

test("rejects zero-byte files", () => {
  const error = validatePropertyMediaFile(file("empty.pdf", "application/pdf", 0));

  assert.match(error || "", /empty/);
});

test("rejects batches beyond the maximum media count", () => {
  const error = validatePropertyMediaFileCount(propertyMediaMaxFiles + 1);

  assert.match(error || "", /Upload up to 10 files/);
});

test("creates unique safe storage paths for same original filename", () => {
  const first = createPropertyMediaStoragePath("property-1", "çmimi pronës.png", "a");
  const second = createPropertyMediaStoragePath("property-1", "çmimi pronës.png", "b");

  assert.notEqual(first, second);
  assert.equal(first, "properties/property-1/a-cmimi-prones.png");
  assert.equal(second, "properties/property-1/b-cmimi-prones.png");
});
