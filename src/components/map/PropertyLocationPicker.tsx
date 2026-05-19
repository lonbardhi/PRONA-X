"use client";

import dynamic from "next/dynamic";
import { LocateFixed, MapPin, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { LatLng } from "@/lib/maps/types";
import { defaultLocale, type Locale } from "@/lib/i18n";

const PropertyLocationPickerMap = dynamic(
  () =>
    import("@/components/map/PropertyLocationPickerMap").then(
      (mod) => mod.PropertyLocationPickerMap,
    ),
  {
    loading: () => (
      <div className="flex h-[360px] items-center justify-center rounded-xl border border-border bg-slate-50 text-sm font-semibold text-slate-500">
        Loading picker...
      </div>
    ),
    ssr: false,
  },
);

export function PropertyLocationPicker({
  city,
  latitude,
  locale = defaultLocale,
  longitude,
  onChange,
  onClear,
}: {
  city?: string;
  latitude: string;
  locale?: Locale;
  longitude: string;
  onChange: (position: LatLng, source: "map_picker" | "manual") => void;
  onClear: () => void;
}) {
  const hasCoordinates = latitude.trim() !== "" && longitude.trim() !== "";
  const isSq = locale === "sq";

  return (
    <div className="grid gap-3 rounded-xl border border-border bg-slate-50 p-3 md:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <MapPin className="h-4 w-4 text-emerald-700" />
            {isSq ? "Pozicioni në hartë" : "Map position"}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {hasCoordinates
              ? isSq
                ? `Koordinatat: ${latitude}, ${longitude}`
                : `Coordinates: ${latitude}, ${longitude}`
              : isSq
                ? "Shto koordinata që prona të shfaqet në hartë."
                : "Add coordinates so this property can appear on the map."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                className="h-10 gap-2"
                type="button"
                variant={hasCoordinates ? "outline" : "default"}
              >
                <LocateFixed className="h-4 w-4" />
                {hasCoordinates
                  ? isSq
                    ? "Rregullo"
                    : "Adjust"
                  : isSq
                    ? "Zgjidh në hartë"
                    : "Pick on map"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl p-4">
              <DialogHeader>
                <DialogTitle>
                  {isSq ? "Zgjidh vendndodhjen e pronës" : "Pick property location"}
                </DialogTitle>
                <DialogDescription>
                  {isSq
                    ? "Kliko hartën ose tërhiq markerin. Ruaj vendndodhje të përafërt kur privatësia e pronarit është e rëndësishme."
                    : "Click the map or drag the marker. Use approximate display when owner privacy matters."}
                </DialogDescription>
              </DialogHeader>
              <PropertyLocationPickerMap
                city={city}
                latitude={latitude}
                longitude={longitude}
                onChange={(position) => onChange(position, "map_picker")}
              />
            </DialogContent>
          </Dialog>

          <Button
            className="h-10 gap-2"
            disabled={!hasCoordinates}
            onClick={onClear}
            type="button"
            variant="outline"
          >
            <Trash2 className="h-4 w-4" />
            {isSq ? "Pastro" : "Clear"}
          </Button>
        </div>
      </div>
    </div>
  );
}
