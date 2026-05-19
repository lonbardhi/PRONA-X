"use client";

import Link from "next/link";
import { Bath, BedDouble, MapPin, Ruler, X } from "lucide-react";

import type { PropertyMapPoint } from "@/lib/maps/types";
import { defaultLocale, type Locale } from "@/lib/i18n";
import {
  formatPropertyPrice,
  formatPropertyType,
  formatStatusLabel,
} from "@/lib/properties";

export function PropertyQuickViewCard({
  locale = defaultLocale,
  onClose,
  property,
}: {
  locale?: Locale;
  onClose?: () => void;
  property: PropertyMapPoint;
}) {
  const isSq = locale === "sq";
  const location = property.neighborhood
    ? `${property.neighborhood}, ${property.city}`
    : property.city;

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-white shadow-lg">
      <div className="relative h-32 bg-slate-100">
        {property.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={property.title}
            className="h-full w-full object-cover"
            src={property.thumbnail_url}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            PRONA X
          </div>
        )}
        <button
          aria-label={isSq ? "Mbyll pamjen e shpejtë të pronës" : "Close property quick view"}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-sm transition hover:bg-white"
          onClick={onClose}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 p-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
              {formatStatusLabel(property.status, locale)}
            </span>
            {property.location_is_approximate ? (
              <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-700">
                {isSq ? "Përafërt" : "Approx."}
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 line-clamp-2 break-words text-sm font-semibold leading-snug text-slate-950">
            {property.title}
          </h3>
          <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
            <span className="truncate">{location}</span>
          </p>
        </div>

        <p className="text-base font-semibold text-slate-950">
          {formatPropertyPrice(property, locale)}
        </p>

        <div className="grid grid-cols-3 gap-2 text-xs text-slate-600">
          <span className="flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1.5">
            <BedDouble className="h-3.5 w-3.5 text-slate-400" />
            {property.bedrooms ?? "-"}
          </span>
          <span className="flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1.5">
            <Bath className="h-3.5 w-3.5 text-slate-400" />
            {property.bathrooms ?? "-"}
          </span>
          <span className="flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1.5">
            <Ruler className="h-3.5 w-3.5 text-slate-400" />
            {property.area_m2 != null ? `${property.area_m2} m2` : "-"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-xs font-semibold text-slate-500">
            {formatPropertyType(property.type, locale)}
          </span>
          <Link
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 px-3 text-xs font-semibold text-white transition hover:bg-slate-800"
            href={property.detailHref}
          >
            {isSq ? "Hap" : "Open"}
          </Link>
        </div>
      </div>
    </article>
  );
}
