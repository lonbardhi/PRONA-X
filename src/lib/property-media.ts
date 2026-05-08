import type { PropertyMedia } from "@/lib/properties";

export type PropertyMediaKind = "image" | "video" | "pdf" | "file";

type MediaRule = {
  extensions: string[];
  kind: PropertyMediaKind;
  label: string;
  maxSize: number;
};

const MB = 1024 * 1024;

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
    maxSize: 100 * MB,
  },
  "video/webm": {
    extensions: [".webm"],
    kind: "video",
    label: "WebM video",
    maxSize: 100 * MB,
  },
  "video/quicktime": {
    extensions: [".mov"],
    kind: "video",
    label: "MOV video",
    maxSize: 100 * MB,
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
  "Photos: JPG, PNG, WebP, AVIF, GIF. Videos: MP4, WebM, MOV. Documents: PDF.";

export function getPropertyMediaMimeType(file: File) {
  const explicitType = file.type.toLowerCase();
  if (propertyMediaRules[explicitType]) {
    return explicitType;
  }

  const filename = file.name.toLowerCase();
  const extension = Object.keys(extensionToMime).find((item) => filename.endsWith(item));

  return extension ? extensionToMime[extension] : null;
}

export function validatePropertyMediaFile(file: File) {
  const mimeType = getPropertyMediaMimeType(file);
  const rule = mimeType ? propertyMediaRules[mimeType] : null;

  if (!rule) {
    return `${file.name} is not a supported media file. Upload JPG, PNG, WebP, AVIF, GIF, MP4, WebM, MOV, or PDF files.`;
  }

  if (file.size > rule.maxSize) {
    return `${file.name} is too large. ${rule.label} files must be ${formatMegabytes(rule.maxSize)} or smaller.`;
  }

  return null;
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
