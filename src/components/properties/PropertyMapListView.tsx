"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  Bath,
  BedDouble,
  Images,
  List,
  LocateFixed,
  MapPin,
  Pencil,
  Ruler,
} from "lucide-react";

import { MapShell } from "@/components/map/MapShell";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import type { PropertyMapPoint } from "@/lib/maps/types";
import {
  formatPropertyPrice,
  formatPropertyType,
  formatStatusLabel,
  type PropertyRecord,
} from "@/lib/properties";
import { pickPrimaryPropertyMedia } from "@/lib/property-media";
import { defaultLocale, type Locale, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type PropertyMapListViewProps = {
  canManage?: boolean;
  locale?: Locale;
  mapPoints: PropertyMapPoint[];
  paginationNode?: ReactNode;
  properties: PropertyRecord[];
};

function PropertyListCard({
  canManage,
  isMapped,
  isSelected,
  locale,
  onSelect,
  property,
}: {
  canManage?: boolean;
  isMapped: boolean;
  isSelected: boolean;
  locale: Locale;
  onSelect: () => void;
  property: PropertyRecord;
}) {
  const cover = pickPrimaryPropertyMedia(property.property_media || []);
  const location = property.neighborhood
    ? `${property.neighborhood}, ${property.city}`
    : property.city;

  return (
    <article
      className={cn(
        "grid min-w-0 gap-3 rounded-xl border bg-white p-3 text-left shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/40",
        isSelected ? "border-emerald-300 bg-emerald-50" : "border-border",
      )}
    >
      <button
        className="grid min-w-0 grid-cols-[88px_minmax(0,1fr)] gap-3 text-left"
        onClick={onSelect}
        type="button"
      >
        <div className="relative h-24 overflow-hidden rounded-lg bg-slate-100">
          {cover?.public_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={property.title}
              className="h-full w-full object-cover"
              src={cover.public_url}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              PRONA X
            </div>
          )}
          <span className="absolute left-1.5 top-1.5 rounded-full bg-white/95 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 shadow-sm">
            {property.property_media?.length || 0}
          </span>
        </div>

        <div className="grid min-w-0 gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-700">
                {formatStatusLabel(property.status, locale)}
              </span>
              {!isMapped ? (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-700">
                  {locale === "sq" ? "Pa hartë" : "No map"}
                </span>
              ) : null}
            </div>
            <h3 className="mt-1 line-clamp-2 break-words text-sm font-semibold leading-snug text-slate-950">
              {property.title}
            </h3>
            <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
              <span className="truncate">{location}</span>
            </p>
          </div>

          <p className="truncate text-sm font-semibold text-slate-950">
            {formatPropertyPrice(property, locale)}
          </p>
        </div>
      </button>

      <div className="grid grid-cols-4 gap-2 text-xs text-slate-600">
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
        <span className="flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1.5">
          <Images className="h-3.5 w-3.5 text-slate-400" />
          {property.property_media?.length || 0}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <span className="min-w-0 truncate text-xs font-semibold text-slate-500">
          {formatPropertyType(property.type, locale)}
        </span>
        <div className="flex items-center gap-2">
          <Link
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            href={canManage ? `/properties/${property.id}/edit` : `/properties/${property.id}`}
          >
            {locale === "sq" ? "Hap" : "Open"}
          </Link>
          {canManage ? (
            <Link
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-slate-950 px-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
              href={`/properties/${property.id}/edit`}
            >
              <Pencil className="h-3.5 w-3.5" />
              {locale === "sq" ? "Ndrysho" : "Edit"}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function PropertyMapListView({
  canManage = true,
  locale = defaultLocale,
  mapPoints,
  paginationNode,
  properties,
}: PropertyMapListViewProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [fitKey, setFitKey] = useState("initial");
  const pointsById = useMemo(
    () => new Map(mapPoints.map((point) => [point.id, point])),
    [mapPoints],
  );

  function selectProperty(propertyId: string) {
    if (pointsById.has(propertyId)) {
      setSelectedPropertyId(propertyId);
    }
  }

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

  const list = (
    <div className="grid content-start gap-3">
      {properties.map((property) => (
        <PropertyListCard
          canManage={canManage}
          isMapped={pointsById.has(property.id)}
          isSelected={selectedPropertyId === property.id}
          key={property.id}
          locale={locale}
          onSelect={() => selectProperty(property.id)}
          property={property}
        />
      ))}
      {paginationNode}
    </div>
  );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-white p-3 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            {locale === "sq" ? "Hartë dhe listë" : "Map and list"}
          </p>
          <p className="text-xs text-slate-500">
            {locale === "sq"
              ? `${mapPoints.length} prona me koordinata në filtrat aktualë.`
              : `${mapPoints.length} mapped properties in the current filters.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="h-10 gap-2"
            onClick={() => setFitKey(String(Date.now()))}
            type="button"
            variant="outline"
          >
            <LocateFixed className="h-4 w-4" />
            {locale === "sq" ? "Shfaq të gjitha" : "Fit results"}
          </Button>
          <Drawer>
            <DrawerTrigger asChild>
              <Button className="h-10 gap-2 lg:hidden" type="button">
                <List className="h-4 w-4" />
                {locale === "sq" ? "Lista" : "List"}
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[82vh]">
              <DrawerHeader>
                <DrawerTitle>{locale === "sq" ? "Listimet" : "Listings"}</DrawerTitle>
                <DrawerDescription>
                  {locale === "sq"
                    ? "Zgjidh një pronë për ta sinkronizuar me hartën."
                    : "Select a property to sync it with the map."}
                </DrawerDescription>
              </DrawerHeader>
              <div className="grid max-h-[64vh] gap-3 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                {list}
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(330px,0.48fr)_minmax(420px,0.52fr)]">
        <div className="hidden max-h-[calc(100vh-9rem)] overflow-y-auto pr-1 lg:block">
          {list}
        </div>
        <MapShell
          className="h-[58vh] min-h-[430px] lg:sticky lg:top-4 lg:h-[calc(100vh-8rem)]"
          fitToResultsKey={fitKey}
          onSelectProperty={(point) => setSelectedPropertyId(point?.id || null)}
          points={mapPoints}
          selectedPropertyId={selectedPropertyId}
        />
      </div>
    </div>
  );
}
