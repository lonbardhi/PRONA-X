import type { PropertyMedia } from "@/lib/properties";

export type PropertyMediaKind = "image" | "video" | "pdf" | "file";

type MediaRule = {
  extensions: string[];
  kind: PropertyMediaKind;
  label: string;
  maxSize: number;
};

const MB = 1024 * 1024;
export const propertyVideoMaxDurationSeconds = 60;
export const propertyVideoMaxSizeMb = 25;
export const propertyMediaMaxFiles = 10;
const propertyVideoMaxSizeBytes = propertyVideoMaxSizeMb * MB;

export const propertyMediaRules: Record<string, MediaRule> = {
  "image/jpeg": {
    extensions: [".jpg", ".jpeg"],
    kind: "image",
    label: "JPEG image",
    maxSize: 20 * MB,
  },
  "image/png": {
    extensions: [".png"],
    kind: "image",
    label: "PNG image",
    maxSize: 20 * MB,
  },
  "image/webp": {
    extensions: [".webp"],
    kind: "image",
    label: "WebP image",
    maxSize: 20 * MB,
  },
  "image/avif": {
    extensions: [".avif"],
    kind: "image",
    label: "AVIF image",
    maxSize: 20 * MB,
  },
  "image/gif": {
    extensions: [".gif"],
    kind: "image",
    label: "GIF image",
    maxSize: 20 * MB,
  },
  "video/mp4": {
    extensions: [".mp4", ".m4v"],
    kind: "video",
    label: "MP4 video",
    maxSize: propertyVideoMaxSizeBytes,
  },
  "video/webm": {
    extensions: [".webm"],
    kind: "video",
    label: "WebM video",
    maxSize: propertyVideoMaxSizeBytes,
  },
  "video/quicktime": {
    extensions: [".mov"],
    kind: "video",
    label: "MOV video",
    maxSize: propertyVideoMaxSizeBytes,
  },
  "application/pdf": {
    extensions: [".pdf"],
    kind: "pdf",
    label: "PDF document",
    maxSize: 25 * MB,
  },
};

const extensionToMime = Object.entries(propertyMediaRules).reduce<Record<string, string>>(
  (map, [mimeType, rule]) => {
    for (const extension of rule.extensions) {
      map[extension] = mimeType;
    }

    return map;
  },
  {},
);

export const propertyMediaAccept = Object.entries(propertyMediaRules)
  .flatMap(([mimeType, rule]) => [mimeType, ...rule.extensions])
  .join(",");

export const propertyMediaHelpText =
  "Upload up to 10 files at once. Photos: JPG, PNG, WebP, AVIF, GIF. Videos: MP4, WebM, MOV up to 60 seconds and 25 MB. Documents: PDF.";

function getFileExtension(name: string) {
  const match = name.toLowerCase().match(/\.[a-z0-9]+$/);
  return match?.[0] || "";
}

export function getPropertyMediaMimeType(file: File) {
  const explicitType = file.type.toLowerCase();
  const extension = getFileExtension(file.name);
  const mimeFromExtension = extensionToMime[extension];

  if (
    explicitType &&
    propertyMediaRules[explicitType] &&
    propertyMediaRules[explicitType].extensions.includes(extension)
  ) {
    return explicitType;
  }

  if (!explicitType || explicitType === "application/octet-stream") {
    return mimeFromExtension || null;
  }

  return null;
}

export function validatePropertyMediaFile(file: File) {
  const mimeType = getPropertyMediaMimeType(file);
  const rule = mimeType ? propertyMediaRules[mimeType] : null;

  if (file.size <= 0) {
    return `${file.name} is empty and cannot be uploaded.`;
  }

  if (!rule) {
    return `${file.name} is not a supported media file. Upload JPG, PNG, WebP, AVIF, GIF, MP4, WebM, MOV, or PDF files.`;
  }

  if (file.size > rule.maxSize) {
    return `${file.name} is too large. ${rule.label} files must be ${formatMegabytes(rule.maxSize)} or smaller.`;
  }

  return null;
}

export function validatePropertyMediaFileCount(
  newFileCount: number,
  existingFileCount = 0,
) {
  const total = existingFileCount + newFileCount;

  if (total > propertyMediaMaxFiles) {
    return `Upload up to ${propertyMediaMaxFiles} files at once.`;
  }

  return null;
}

export function sanitizePropertyMediaFilename(name: string) {
  const fallback = "property-media";
  const extension = getFileExtension(name);
  const basename = extension ? name.slice(0, -extension.length) : name;
  const cleanBasename = basename
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
  const cleanExtension = extension.replace(/[^a-z0-9.]/g, "");

  return `${cleanBasename || fallback}${cleanExtension}`;
}

export function createPropertyMediaStoragePath(
  propertyId: string,
  originalFilename: string,
  uniqueId = crypto.randomUUID(),
) {
  return `properties/${propertyId}/${uniqueId}-${sanitizePropertyMediaFilename(
    originalFilename,
  )}`;
}

export function getPropertyMediaKindFromUrl(url: string): PropertyMediaKind {
  const cleanUrl = url.toLowerCase().split("?")[0];
  const match = Object.entries(propertyMediaRules).find(([, rule]) =>
    rule.extensions.some((extension) => cleanUrl.endsWith(extension)),
  );

  return match?.[1].kind || "file";
}

export function pickPrimaryPropertyMedia(media: PropertyMedia[]) {
  return (
    media.find((item) => getPropertyMediaKindFromUrl(item.public_url) === "image") ||
    media[0]
  );
}

function formatMegabytes(bytes: number) {
  return `${Math.round(bytes / MB)} MB`;
}
