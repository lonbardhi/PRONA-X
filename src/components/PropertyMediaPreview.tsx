import Image from "next/image";
import { FileText, Video } from "lucide-react";

import type { PropertyMedia } from "@/lib/properties";
import { getPropertyMediaKindFromUrl } from "@/lib/property-media";

type PropertyMediaPreviewProps = {
  emptyLabel?: string;
  fit?: "contain" | "cover";
  media?: PropertyMedia;
  priority?: boolean;
  sizes?: string;
  title: string;
  zoom?: boolean;
};

export function PropertyMediaPreview({
  emptyLabel = "No media",
  fit = "cover",
  media,
  priority = false,
  sizes = "100vw",
  title,
  zoom = false,
}: PropertyMediaPreviewProps) {
  if (!media) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-400">
        {emptyLabel}
      </div>
    );
  }

  const kind = getPropertyMediaKindFromUrl(media.public_url);
  const label = media.alt_text || title;

  if (kind === "image") {
    return (
      <Image
        src={media.public_url}
        alt={label}
        fill
        loading={priority ? "eager" : "lazy"}
        sizes={sizes}
        className={`object-center transition-transform duration-500 ${
          fit === "cover" ? "object-cover" : "object-contain"
        } ${zoom ? "scale-[1.06]" : ""}`}
        style={{
          objectFit: fit,
          objectPosition: "center center",
        }}
      />
    );
  }

  if (kind === "video") {
    return (
      <video
        controls
        muted
        preload="metadata"
        aria-label={label}
        className="h-full w-full bg-slate-950 object-cover"
      >
        <source src={media.public_url} />
      </video>
    );
  }

  if (kind === "pdf") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
          <FileText className="h-7 w-7" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-950">PDF document</p>
          <a
            href={media.public_url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
          >
            Open PDF
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-200 text-slate-600">
        <Video className="h-7 w-7" />
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-950">Media file</p>
        <a
          href={media.public_url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
        >
          Open file
        </a>
      </div>
    </div>
  );
}
