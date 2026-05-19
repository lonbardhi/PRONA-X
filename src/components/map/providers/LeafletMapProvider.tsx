"use client";

import { useMemo, useState } from "react";
import { MapContainer } from "react-leaflet";

import { PropertyQuickViewCard } from "@/components/map/PropertyQuickViewCard";
import { BoundaryLayer } from "@/components/map/layers/BoundaryLayer";
import { InteractionLayer } from "@/components/map/layers/InteractionLayer";
import { PropertyMarkerLayer } from "@/components/map/layers/PropertyMarkerLayer";
import { LeafletTileLayer } from "@/components/map/layers/TileLayer";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { calculateBoundsForPoints } from "@/lib/maps/coordinates";
import type { LatLng, PropertyMapPoint, TileSourceConfig } from "@/lib/maps/types";
import { cn } from "@/lib/utils";

type LeafletMapProviderProps = {
  className?: string;
  fitToResultsKey?: string;
  initialViewport: { center: LatLng; zoom: number };
  locale?: Locale;
  onSelectProperty?: (property: PropertyMapPoint | null) => void;
  points: PropertyMapPoint[];
  selectedPropertyId?: string | null;
  tileSource: TileSourceConfig;
};

export function LeafletMapProvider({
  className,
  fitToResultsKey,
  initialViewport,
  locale = defaultLocale,
  onSelectProperty,
  points,
  selectedPropertyId,
  tileSource,
}: LeafletMapProviderProps) {
  const [tileError, setTileError] = useState(false);
  const selectedProperty = useMemo(
    () => points.find((point) => point.id === selectedPropertyId) || null,
    [points, selectedPropertyId],
  );
  const bounds = useMemo(
    () => calculateBoundsForPoints(points.map((point) => point.position)),
    [points],
  );

  function handleViewportChange() {
    // Extension point for Phase 1.1 "Search this area" without tying filters to Leaflet.
  }

  return (
    <div
      className={cn(
        "relative min-h-[420px] overflow-hidden rounded-xl border border-border bg-slate-100 shadow-sm",
        className,
      )}
    >
      <MapContainer
        aria-label="PRONA X property map"
        center={[initialViewport.center.lat, initialViewport.center.lng]}
        className="h-full min-h-[420px] w-full"
        maxZoom={tileSource.maxZoom}
        minZoom={tileSource.minZoom}
        preferCanvas
        scrollWheelZoom
        zoom={initialViewport.zoom}
      >
        <LeafletTileLayer onTileError={() => setTileError(true)} tileSource={tileSource} />
        <BoundaryLayer />
        <PropertyMarkerLayer
          onSelectProperty={onSelectProperty}
          points={points}
          selectedPropertyId={selectedPropertyId}
        />
        <InteractionLayer
          bounds={bounds}
          fitToResultsKey={fitToResultsKey}
          onViewportChange={handleViewportChange}
          selectedPoint={selectedProperty?.position || null}
        />
      </MapContainer>

      {tileError ? (
        <div className="absolute left-3 top-3 z-[500] max-w-[18rem] rounded-xl border border-amber-200 bg-white/95 px-3 py-2 text-xs font-semibold text-amber-800 shadow-sm">
          Map tiles are slow or unavailable. The list remains usable.
        </div>
      ) : null}

      {points.length === 0 ? (
        <div className="absolute inset-x-4 top-1/2 z-[500] -translate-y-1/2 rounded-xl border border-border bg-white/95 p-4 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-950">No mapped properties</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            The current filters do not have properties with valid coordinates yet.
          </p>
        </div>
      ) : null}

      {selectedProperty ? (
        <div className="absolute inset-x-3 bottom-8 z-[500] mx-auto max-w-sm sm:left-4 sm:right-auto">
          <PropertyQuickViewCard
            locale={locale}
            onClose={() => onSelectProperty?.(null)}
            property={selectedProperty}
          />
        </div>
      ) : null}
    </div>
  );
}
