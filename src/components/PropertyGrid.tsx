"use client";

import Link from "next/link";
import { useState, type KeyboardEvent, type MouseEvent } from "react";
import {
  Bath,
  BedDouble,
  Edit3,
  Images,
  Landmark,
  MapPin,
  Percent,
  Ruler,
  Trash2,
} from "lucide-react";

import { deletePropertyAction } from "@/app/properties/actions";
import { FavoritePropertyButton } from "@/components/FavoritePropertyButton";
import { PropertyMediaPreview } from "@/components/PropertyMediaPreview";
import { PropertyQuickViewDialog } from "@/components/PropertyQuickViewDialog";
import type { PropertyRecord } from "@/lib/properties";
import {
  formatDevelopmentAgreement,
  formatEuro,
  formatPropertyType,
  formatStatusLabel,
  isDevelopmentLand,
} from "@/lib/properties";
import { pickPrimaryPropertyMedia } from "@/lib/property-media";
import { SharePropertyButton } from "@/components/SharePropertyButton";
import { defaultLocale, type Locale, t } from "@/lib/i18n";

type PropertyGridProps = {
  canManage?: boolean;
  locale?: Locale;
  properties: PropertyRecord[];
};

function getStatusTone(status: PropertyRecord["status"]) {
  if (
    status === "published" ||
    status === "ready_for_developers" ||
    status === "documents_verified" ||
    status === "agreement_signed" ||
    status === "completed"
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    status === "reserved" ||
    status === "offer_received" ||
    status === "negotiation" ||
    status === "agreement_in_principle" ||
    status === "contract_drafting"
  ) {
    return "bg-amber-50 text-amber-700";
  }

  if (status === "sold" || status === "project_in_progress") {
    return "bg-blue-50 text-blue-700";
  }

  if (status === "rented" || status === "presented_to_developers") {
    return "bg-cyan-50 text-cyan-700";
  }

  if (status === "rejected" || status === "withdrawn") {
    return "bg-rose-50 text-rose-700";
  }

  if (status === "archived") {
    return "bg-slate-200 text-slate-600";
  }

  return "bg-slate-100 text-slate-700";
}

function shouldIgnoreCardOpen(event: MouseEvent<HTMLElement>) {
  const target = event.target;

  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      "a, button, input, select, textarea, form, label, [data-prevent-card-open]",
    ),
  );
}

export function PropertyGrid({
  canManage = true,
  locale = defaultLocale,
  properties,
}: PropertyGridProps) {
  const [selectedProperty, setSelectedProperty] = useState<PropertyRecord | null>(null);

  if (properties.length === 0) {
    return (
      <div className="crm-empty-state sm:p-8">
        <h2 className="text-lg font-semibold text-slate-950">
          {t(locale, "property.noProperties")}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {t(locale, "property.noPropertiesHint")}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {properties.map((property, index) => {
          const cover = pickPrimaryPropertyMedia(property.property_media || []);
          const developmentLand = isDevelopmentLand(property);

          function openProperty() {
            setSelectedProperty(property);
          }

          function openPropertyFromKeyboard(event: KeyboardEvent<HTMLElement>) {
            if (event.target !== event.currentTarget) {
              return;
            }

            if (event.key !== "Enter" && event.key !== " ") {
              return;
            }

            event.preventDefault();
            openProperty();
          }

          return (
            <article
              aria-label={`${locale === "sq" ? "Hap detajet për" : "Open details for"} ${property.title}`}
              className="crm-card-interactive min-w-0 cursor-pointer overflow-hidden"
              key={property.id}
              onClick={(event) => {
                if (!shouldIgnoreCardOpen(event)) {
                  openProperty();
                }
              }}
              onKeyDown={openPropertyFromKeyboard}
              role="button"
              tabIndex={0}
            >
            <div className="relative h-48 w-full overflow-hidden bg-slate-100">
              <PropertyMediaPreview
                emptyLabel={t(locale, "property.noMedia")}
                fit="cover"
                media={cover}
                priority={index === 0}
                sizes="(min-width: 1280px) 31vw, (min-width: 768px) 45vw, 100vw"
                title={property.title}
                zoom
              />
              <div className="absolute left-3 top-3 flex max-w-[calc(100%-5rem)] items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                <span className="truncate">
                  {property.neighborhood
                    ? `${property.neighborhood}, ${property.city}`
                    : property.city}
                </span>
              </div>
              <div className="absolute right-3 top-3">
                <FavoritePropertyButton propertyId={property.id} title={property.title} />
              </div>
            </div>

            <div className="grid min-w-0 gap-4 p-4">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="line-clamp-2 break-words text-base font-semibold leading-snug text-slate-950">
                    {property.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatPropertyType(property.type, locale)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(property.status)}`}
                  >
                      {formatStatusLabel(property.status, locale)}
                  </span>
                  {canManage && (property.property_media?.length || 0) === 0 ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      {t(locale, "property.missingMedia")}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 break-words text-lg font-semibold text-slate-950">
                  {developmentLand
                    ? formatDevelopmentAgreement(property, locale)
                    : formatEuro(property.price_eur || 0, locale)}
                </p>
                <div className="flex shrink-0 items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  <Images className="h-3.5 w-3.5 text-slate-400" />
                  {property.property_media?.length || 0}
                </div>
              </div>

              {developmentLand ? (
                <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 max-[380px]:grid-cols-1">
                  <div className="min-w-0 rounded-lg bg-slate-50 p-2.5">
                    <p className="flex items-center gap-1 text-slate-400">
                      <Landmark className="h-3.5 w-3.5" />
                      {t(locale, "property.plot")}
                    </p>
                    <p className="mt-1 truncate font-semibold text-slate-950">
                      {property.plot_size_m2 != null
                        ? `${property.plot_size_m2} m2`
                        : "-"}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-lg bg-slate-50 p-2.5">
                    <p className="flex items-center gap-1 text-slate-400">
                      <Percent className="h-3.5 w-3.5" />
                      {t(locale, "property.ownerPercent")}
                    </p>
                    <p className="mt-1 font-semibold text-slate-950">
                      {property.landowner_requested_percentage != null
                        ? `${property.landowner_requested_percentage}%`
                        : "-"}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-lg bg-slate-50 p-2.5">
                    <p className="flex items-center gap-1 text-slate-400">
                      <Ruler className="h-3.5 w-3.5" />
                      {t(locale, "property.buildable")}
                    </p>
                    <p className="mt-1 truncate font-semibold text-slate-950">
                      {property.estimated_gross_buildable_area_m2 != null
                        ? `${property.estimated_gross_buildable_area_m2} m2`
                        : "-"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 max-[380px]:grid-cols-1">
                  <div className="min-w-0 rounded-lg bg-slate-50 p-2.5">
                    <p className="flex items-center gap-1 text-slate-400">
                      <BedDouble className="h-3.5 w-3.5" />
                      {t(locale, "property.beds")}
                    </p>
                    <p className="mt-1 font-semibold text-slate-950">
                      {property.bedrooms ?? "-"}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-lg bg-slate-50 p-2.5">
                    <p className="flex items-center gap-1 text-slate-400">
                      <Bath className="h-3.5 w-3.5" />
                      {t(locale, "property.baths")}
                    </p>
                    <p className="mt-1 font-semibold text-slate-950">
                      {property.bathrooms ?? "-"}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-lg bg-slate-50 p-2.5">
                    <p className="flex items-center gap-1 text-slate-400">
                      <Ruler className="h-3.5 w-3.5" />
                      {t(locale, "property.area")}
                    </p>
                    <p className="mt-1 truncate font-semibold text-slate-950">
                      {property.area_m2 != null ? `${property.area_m2} m2` : "-"}
                    </p>
                  </div>
                </div>
              )}

              {canManage ? (
                <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 min-[420px]:flex min-[420px]:flex-wrap min-[420px]:items-center">
                  <Link
                    href={`/properties/${property.id}/edit`}
                    prefetch={false}
                    className="crm-button crm-button-secondary h-9 min-h-9 px-3"
                  >
                    <Edit3 className="h-4 w-4" />
                    {locale === "sq" ? "Ndrysho" : "Edit"}
                  </Link>
                  <form action={deletePropertyAction}>
                    <input type="hidden" name="property_id" value={property.id} />
                    <button className="crm-button crm-button-danger h-9 min-h-9 w-full px-3">
                      <Trash2 className="h-4 w-4" />
                      {locale === "sq" ? "Fshi" : "Delete"}
                    </button>
                  </form>
                  <SharePropertyButton
                    isPublished={property.status === "published"}
                    locale={locale}
                    propertyId={property.id}
                    title={property.title}
                  />
                </div>
              ) : null}
            </div>
            </article>
          );
        })}
      </div>
      <PropertyQuickViewDialog
        canManage={canManage}
        locale={locale}
        onClose={() => setSelectedProperty(null)}
        property={selectedProperty}
      />
    </>
  );
}
