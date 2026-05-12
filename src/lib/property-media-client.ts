"use client";

import { getSupabaseEnv } from "@/lib/env";
import type { PropertyMedia } from "@/lib/properties";
import {
  getPropertyMediaMimeType,
  getPropertyMediaKindFromUrl,
  propertyMediaMaxFiles,
  propertyMediaRules,
  propertyVideoMaxDurationSeconds,
} from "@/lib/property-media";
import { createClient } from "@/lib/supabase/browser";

const MEDIA_BUCKET = "property-media";

export type PropertyUploadQueueItem = {
  error?: string;
  name: string;
  progress: number;
  status:
    | "queued"
    | "validating"
    | "ready"
    | "uploading"
    | "saving"
    | "done"
    | "error";
};

type DirectUploadResult = {
  mediaCount: number;
  propertyId: string;
  propertyTitle: string;
  redirectPath: string;
  success: boolean;
};

export type PropertyMutationResponse = Partial<DirectUploadResult> & {
  message?: string;
  success?: boolean;
};

type UploadPropertyMediaOptions = {
  files: File[];
  locale: "sq" | "en";
  propertyId: string;
  propertyTitle: string;
  startIndex?: number;
  updateQueueItem: (
    index: number,
    patch: Partial<PropertyUploadQueueItem>,
  ) => void;
};

function isSq(locale: "sq" | "en") {
  return locale === "sq";
}

function encodeStoragePath(path: string) {
  return path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function cleanFilename(name: string) {
  const fallback = "property-media";
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  return clean || fallback;
}

function getVideoDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
    };

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      cleanup();
      resolve(duration);
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("VIDEO_METADATA_ERROR"));
    };

    video.src = objectUrl;
  });
}

export async function validatePropertyMediaSelection(
  files: File[],
  locale: "sq" | "en",
  existingMedia: PropertyMedia[] = [],
) {
  if (files.length > propertyMediaMaxFiles) {
    return isSq(locale)
      ? `Ngarko deri ne ${propertyMediaMaxFiles} skedare njekohesisht.`
      : `Upload up to ${propertyMediaMaxFiles} files at once.`;
  }

  const existingVideoCount = existingMedia.filter(
    (item) => getPropertyMediaKindFromUrl(item.public_url) === "video",
  ).length;
  const selectedVideoFiles = files.filter((file) => {
    const mimeType = getPropertyMediaMimeType(file);
    return mimeType ? propertyMediaRules[mimeType]?.kind === "video" : false;
  });

  if (existingVideoCount + selectedVideoFiles.length > 1) {
    return isSq(locale)
      ? "Lejohet vetem nje video per prone. Hiq videon ekzistuese ose ngarko vetem nje video te re."
      : "Only one video is allowed per property. Remove the existing video or upload just one new video.";
  }

  for (const file of files) {
    const mimeType = getPropertyMediaMimeType(file);
    const rule = mimeType ? propertyMediaRules[mimeType] : null;

    if (!rule) {
      return isSq(locale)
        ? `${file.name} nuk eshte format i mbeshtetur. Ngarko JPG, PNG, WebP, AVIF, GIF, MP4, WebM, MOV ose PDF.`
        : `${file.name} is not a supported media file. Upload JPG, PNG, WebP, AVIF, GIF, MP4, WebM, MOV, or PDF files.`;
    }

    if (file.size > rule.maxSize) {
      return isSq(locale)
        ? `${file.name} eshte shume i madh. ${rule.label} duhet te jete ${Math.round(
            rule.maxSize / (1024 * 1024),
          )} MB ose me pak.`
        : `${file.name} is too large. ${rule.label} files must be ${Math.round(
            rule.maxSize / (1024 * 1024),
          )} MB or smaller.`;
    }

    if (rule.kind === "video") {
      try {
        const duration = await getVideoDuration(file);
        if (duration > propertyVideoMaxDurationSeconds) {
          return isSq(locale)
            ? `${file.name} eshte shume e gjate. Videoja duhet te jete maksimumi ${propertyVideoMaxDurationSeconds} sekonda.`
            : `${file.name} is too long. Videos must be ${propertyVideoMaxDurationSeconds} seconds or shorter.`;
        }
      } catch {
        return isSq(locale)
          ? `Nuk u lexua dot gjatesia e videos ${file.name}. Provo nje file tjeter ose kompresoje videon.`
          : `Could not read the duration of ${file.name}. Try another file or compress the video.`;
      }
    }
  }

  return null;
}

async function uploadFileWithProgress(
  file: File,
  storagePath: string,
  onProgress: (progress: number) => void,
) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("AUTH_REQUIRED");
  }

  const { url, anonKey } = getSupabaseEnv();
  const uploadUrl = `${url}/storage/v1/object/${MEDIA_BUCKET}/${encodeStoragePath(storagePath)}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl, true);
    xhr.setRequestHeader("apikey", anonKey);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader(
      "content-type",
      file.type || "application/octet-stream",
    );

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };

    xhr.onerror = () => {
      reject(new Error("UPLOAD_NETWORK_ERROR"));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }

      reject(new Error(xhr.responseText || "UPLOAD_FAILED"));
    };

    xhr.send(file);
  });
}

function getUploadErrorMessage(error: unknown, locale: "sq" | "en") {
  const message =
    error instanceof Error && error.message ? error.message : "UPLOAD_FAILED";

  if (message.includes("Duplicate")) {
    return isSq(locale)
      ? "Ky skedar eshte ngarkuar tashme. Ndrysho emrin ose provo nje skedar tjeter."
      : "This file was already uploaded. Rename it or try a different file.";
  }

  if (message.includes("AUTH_REQUIRED")) {
    return isSq(locale)
      ? "Sesioni skadoi gjate ngarkimit. Hyr perseri dhe provo."
      : "Your session expired during upload. Sign in again and try once more.";
  }

  if (message.includes("Payload too large")) {
    return isSq(locale)
      ? "Skedari eshte ende shume i madh per ngarkim. Kompresoje dhe provo perseri."
      : "The file is still too large to upload. Compress it and try again.";
  }

  return isSq(locale)
    ? "Ngarkimi i medias deshtoi. Provo perseri me nje file me te vogel ose lidhje me te qendrueshme."
    : "Media upload failed. Try again with a smaller file or a more stable connection.";
}

export async function uploadPropertyMediaDirect({
  files,
  locale,
  propertyId,
  propertyTitle,
  startIndex = 0,
  updateQueueItem,
}: UploadPropertyMediaOptions) {
  const supabase = createClient();

  for (const [index, file] of files.entries()) {
    updateQueueItem(index, { progress: 0, status: "uploading" });
    const storagePath = `properties/${propertyId}/${crypto.randomUUID()}-${cleanFilename(file.name)}`;

    try {
      await uploadFileWithProgress(file, storagePath, (progress) => {
        updateQueueItem(index, { progress, status: "uploading" });
      });

      updateQueueItem(index, { progress: 100, status: "saving" });
      const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath);
      const { error } = await supabase.from("property_media").insert({
        alt_text: propertyTitle,
        bucket_id: MEDIA_BUCKET,
        property_id: propertyId,
        public_url: data.publicUrl,
        sort_order: startIndex + index,
        storage_path: storagePath,
      });

      if (error) {
        await supabase.storage.from(MEDIA_BUCKET).remove([storagePath]);
        throw error;
      }

      updateQueueItem(index, { progress: 100, status: "done" });
    } catch (error) {
      updateQueueItem(index, {
        error: getUploadErrorMessage(error, locale),
        status: "error",
      });
      throw error;
    }
  }
}

export function createInitialUploadQueue(files: File[]): PropertyUploadQueueItem[] {
  return files.map((file) => ({
    name: file.name,
    progress: 0,
    status: "queued",
  }));
}

export function getMediaMutationErrorMessage(
  locale: "sq" | "en",
  result: PropertyMutationResponse,
) {
  if (result.message) {
    return result.message;
  }

  return isSq(locale)
    ? "Prona nuk u ruajt. Kontrollo fushat dhe provo perseri."
    : "The property could not be saved. Check the fields and try again.";
}
