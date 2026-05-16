"use client";

import { getSupabaseEnv } from "@/lib/env";
import type { PropertyMedia } from "@/lib/properties";
import {
  createPropertyMediaStoragePath,
  getPropertyMediaKindFromUrl,
  getPropertyMediaMimeType,
  propertyMediaMaxFiles,
  propertyMediaRules,
  propertyVideoMaxDurationSeconds,
  validatePropertyMediaFile,
} from "@/lib/property-media";
import { createClient } from "@/lib/supabase/browser";

const MEDIA_BUCKET = "property-media";
const UPLOAD_TIMEOUT_MS = 120_000;
const UPLOAD_STALL_MS = 45_000;

export type PropertyUploadQueueStatus =
  | "queued"
  | "validating"
  | "ready"
  | "uploading"
  | "saving"
  | "done"
  | "error"
  | "cancelled";

export type PropertyUploadQueueItem = {
  error?: string;
  file: File;
  id: string;
  name: string;
  order: number;
  progress: number;
  size: number;
  status: PropertyUploadQueueStatus;
  type: string;
};

type PropertyUploadResult = {
  error?: string;
  itemId: string;
  name: string;
  storagePath?: string;
  success: boolean;
};

type PropertyUploadSummary = {
  failed: PropertyUploadResult[];
  succeeded: PropertyUploadResult[];
};

type UploadPropertyMediaOptions = {
  items: PropertyUploadQueueItem[];
  locale: "sq" | "en";
  propertyId: string;
  propertyTitle: string;
  startIndex?: number;
  updateQueueItem: (
    itemId: string,
    patch: Partial<PropertyUploadQueueItem>,
  ) => void;
};

class PropertyMediaUploadError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "PropertyMediaUploadError";
    this.status = status;
  }
}

function isSq(locale: "sq" | "en") {
  return locale === "sq";
}

function encodeStoragePath(path: string) {
  return path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
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

export function createInitialUploadQueue(
  files: File[],
  startOrder = 0,
): PropertyUploadQueueItem[] {
  return files.map((file, index) => ({
    file,
    id: crypto.randomUUID(),
    name: file.name,
    order: startOrder + index,
    progress: 0,
    size: file.size,
    status: "validating",
    type: file.type,
  }));
}

function translateValidationError(error: string, locale: "sq" | "en") {
  if (!isSq(locale)) {
    return error;
  }

  if (error.includes("empty")) {
    return "Skedari eshte bosh dhe nuk mund te ngarkohet.";
  }

  if (error.includes("not a supported")) {
    return "Formati nuk mbeshtetet. Ngarko JPG, PNG, WebP, AVIF, GIF, MP4, WebM, MOV ose PDF.";
  }

  if (error.includes("too large")) {
    return "Skedari eshte shume i madh. Kompresoje dhe provo perseri.";
  }

  return "Skedari nuk kaloi validimin. Kontrollo formatin dhe madhesine.";
}

export async function validatePropertyMediaQueueItem(
  item: PropertyUploadQueueItem,
  locale: "sq" | "en",
) {
  const fileError = validatePropertyMediaFile(item.file);

  if (fileError) {
    return `${item.name}: ${translateValidationError(fileError, locale)}`;
  }

  const mimeType = getPropertyMediaMimeType(item.file);
  const rule = mimeType ? propertyMediaRules[mimeType] : null;

  if (rule?.kind === "video") {
    try {
      const duration = await getVideoDuration(item.file);

      if (duration > propertyVideoMaxDurationSeconds) {
        return isSq(locale)
          ? `${item.name}: Videoja duhet te jete maksimumi ${propertyVideoMaxDurationSeconds} sekonda.`
          : `${item.name}: Videos must be ${propertyVideoMaxDurationSeconds} seconds or shorter.`;
      }
    } catch {
      return isSq(locale)
        ? `${item.name}: Nuk u lexua dot gjatesia e videos. Provo nje file tjeter ose kompresoje videon.`
        : `${item.name}: Could not read the video duration. Try another file or compress the video.`;
    }
  }

  return null;
}

export function getPropertyMediaSelectionLimitMessage(
  locale: "sq" | "en",
  existingCount = 0,
) {
  return isSq(locale)
    ? `Mund te kesh maksimumi ${propertyMediaMaxFiles} skedare media per prone. Aktualisht ka ${existingCount}.`
    : `A property can have up to ${propertyMediaMaxFiles} media files. It currently has ${existingCount}.`;
}

async function uploadFileWithProgress(
  file: File,
  storagePath: string,
  accessToken: string,
  contentType: string,
  onProgress: (progress: number) => void,
) {
  const { url, anonKey } = getSupabaseEnv();
  const uploadUrl = `${url}/storage/v1/object/${MEDIA_BUCKET}/${encodeStoragePath(storagePath)}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let completed = false;
    let stalledTimer: ReturnType<typeof setTimeout> | null = null;

    const finish = (callback: () => void) => {
      if (completed) {
        return;
      }

      completed = true;
      if (stalledTimer) {
        clearTimeout(stalledTimer);
      }

      callback();
    };

    stalledTimer = setTimeout(() => {
      finish(() => reject(new PropertyMediaUploadError("UPLOAD_STALLED")));
      xhr.abort();
    }, UPLOAD_STALL_MS);

    xhr.open("POST", uploadUrl, true);
    xhr.timeout = UPLOAD_TIMEOUT_MS;
    xhr.setRequestHeader("apikey", anonKey);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("cache-control", "3600");
    xhr.setRequestHeader("content-type", contentType);
    xhr.setRequestHeader("x-upsert", "false");

    xhr.upload.onloadstart = () => {
      onProgress(1);
    };

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      if (stalledTimer) {
        clearTimeout(stalledTimer);
        stalledTimer = null;
      }

      onProgress(Math.max(1, Math.min(99, Math.round((event.loaded / event.total) * 100))));
    };

    xhr.onerror = () => {
      finish(() => reject(new PropertyMediaUploadError("UPLOAD_NETWORK_ERROR")));
    };

    xhr.ontimeout = () => {
      finish(() => reject(new PropertyMediaUploadError("UPLOAD_TIMEOUT")));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        finish(resolve);
        return;
      }

      finish(() =>
        reject(
          new PropertyMediaUploadError(
            xhr.responseText || "UPLOAD_FAILED",
            xhr.status,
          ),
        ),
      );
    };

    xhr.send(file);
  });
}

function getUploadErrorMessage(error: unknown, locale: "sq" | "en") {
  const status =
    error instanceof PropertyMediaUploadError ? error.status : undefined;
  const message =
    error instanceof Error && error.message ? error.message : "UPLOAD_FAILED";

  if (status === 401 || status === 403 || message.includes("AUTH_REQUIRED")) {
    return isSq(locale)
      ? "Sesioni skadoi gjate ngarkimit. Hyr perseri dhe provo."
      : "Your session expired during upload. Sign in again and try once more.";
  }

  if (status === 413 || message.includes("Payload too large")) {
    return isSq(locale)
      ? "Skedari eshte shume i madh per ngarkim. Kompresoje dhe provo perseri."
      : "The file is too large to upload. Compress it and try again.";
  }

  if (status === 415 || message.includes("Unsupported")) {
    return isSq(locale)
      ? "Formati i skedarit nuk mbeshtetet."
      : "This file format is not supported.";
  }

  if (message.includes("Duplicate")) {
    return isSq(locale)
      ? "Ky skedar eshte ngarkuar tashme. Ndrysho emrin ose provo nje skedar tjeter."
      : "This file was already uploaded. Rename it or try a different file.";
  }

  if (message.includes("UPLOAD_STALLED") || message.includes("UPLOAD_TIMEOUT")) {
    return isSq(locale)
      ? "Ngarkimi mbeti pa pergjigje. Kontrollo lidhjen dhe provo perseri."
      : "The upload stalled. Check the connection and try again.";
  }

  return isSq(locale)
    ? "Ngarkimi i medias deshtoi. Provo perseri me nje skedar me te vogel ose lidhje me te qendrueshme."
    : "Media upload failed. Try again with a smaller file or a more stable connection.";
}

export async function uploadPropertyMediaDirect({
  items,
  locale,
  propertyId,
  propertyTitle,
  startIndex = 0,
  updateQueueItem,
}: UploadPropertyMediaOptions): Promise<PropertyUploadSummary> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!session?.access_token || !user) {
    const errorMessage = getUploadErrorMessage(new Error("AUTH_REQUIRED"), locale);
    for (const item of items) {
      updateQueueItem(item.id, { error: errorMessage, status: "error" });
    }

    return {
      failed: items.map((item) => ({
        error: errorMessage,
        itemId: item.id,
        name: item.name,
        success: false,
      })),
      succeeded: [],
    };
  }

  const summary: PropertyUploadSummary = {
    failed: [],
    succeeded: [],
  };

  for (const item of items) {
    if (item.status === "cancelled" || item.status === "done") {
      continue;
    }

    const contentType = getPropertyMediaMimeType(item.file);
    if (!contentType) {
      const errorMessage = getUploadErrorMessage(
        new PropertyMediaUploadError("Unsupported property media format.", 415),
        locale,
      );
      updateQueueItem(item.id, { error: errorMessage, status: "error" });
      summary.failed.push({
        error: errorMessage,
        itemId: item.id,
        name: item.name,
        success: false,
      });
      continue;
    }

    updateQueueItem(item.id, { error: undefined, progress: 0, status: "uploading" });
    const storagePath = createPropertyMediaStoragePath(propertyId, item.name);

    try {
      await uploadFileWithProgress(
        item.file,
        storagePath,
        session.access_token,
        contentType,
        (progress) => {
          updateQueueItem(item.id, { progress, status: "uploading" });
        },
      );

      updateQueueItem(item.id, { progress: 100, status: "saving" });
      const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath);
      const { error } = await supabase.from("property_media").insert({
        alt_text: propertyTitle,
        bucket_id: MEDIA_BUCKET,
        created_by: user.id,
        property_id: propertyId,
        public_url: data.publicUrl,
        sort_order: startIndex + item.order,
        storage_path: storagePath,
      });

      if (error) {
        await supabase.storage.from(MEDIA_BUCKET).remove([storagePath]);
        throw error;
      }

      updateQueueItem(item.id, { error: undefined, progress: 100, status: "done" });
      summary.succeeded.push({
        itemId: item.id,
        name: item.name,
        storagePath,
        success: true,
      });
    } catch (error) {
      const errorMessage = getUploadErrorMessage(error, locale);
      updateQueueItem(item.id, {
        error: errorMessage,
        status: "error",
      });
      summary.failed.push({
        error: errorMessage,
        itemId: item.id,
        name: item.name,
        success: false,
      });
    }
  }

  return summary;
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

export function getUploadSummaryMessage(
  locale: "sq" | "en",
  failedCount: number,
  succeededCount: number,
) {
  if (failedCount === 0) {
    return null;
  }

  if (succeededCount > 0) {
    return isSq(locale)
      ? `${succeededCount} skedare u ngarkuan, por ${failedCount} deshtuan. Mund te provosh perseri vetem skedaret e deshtuar.`
      : `${succeededCount} files uploaded, but ${failedCount} failed. You can retry only the failed files.`;
  }

  return isSq(locale)
    ? "Ngarkimi i medias deshtoi. Provo perseri ose shtoje median nga faqja e ndryshimit."
    : "Media upload failed. Try again or add the media from the edit page.";
}

export type PropertyMutationResponse = {
  mediaCount?: number;
  message?: string;
  propertyId?: string;
  propertyTitle?: string;
  redirectPath?: string;
  success?: boolean;
};

export function getExistingPropertyMediaCount(media?: PropertyMedia[]) {
  if (!media) {
    return 0;
  }

  return media.length;
}

export function getExistingPropertyVideoCount(media?: PropertyMedia[]) {
  if (!media) {
    return 0;
  }

  return media.filter((item) => getPropertyMediaKindFromUrl(item.public_url) === "video")
    .length;
}
