import dynamic from "next/dynamic";

import { getDefaultMapViewport, getMapProviderName, getTileSourceConfig } from "@/lib/maps/config";
import type { PropertyMapPoint } from "@/lib/maps/types";
import { defaultLocale, type Locale } from "@/lib/i18n";

const LeafletMapProvider = dynamic(
  () => import("@/components/map/providers/LeafletMapProvider").then((mod) => mod.LeafletMapProvider),
  {
    loading: () => (
      <div className="flex h-full min-h-[360px] items-center justify-center rounded-xl border border-border bg-slate-50 text-sm font-semibold text-slate-500">
        Loading map...
      </div>
    ),
    ssr: false,
  },
);

export type MapShellProps = {
  className?: string;
  fitToResultsKey?: string;
  locale?: Locale;
  onSelectProperty?: (property: PropertyMapPoint | null) => void;
  points: PropertyMapPoint[];
  selectedPropertyId?: string | null;
};

export function MapShell({
  className,
  fitToResultsKey,
  locale = defaultLocale,
  onSelectProperty,
  points,
  selectedPropertyId,
}: MapShellProps) {
  const provider = getMapProviderName();
  const tileSource = getTileSourceConfig();
  const viewport = getDefaultMapViewport();

  if (provider !== "leaflet") {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-sm font-semibold text-amber-800">
        MapLibre provider is scaffolded for Phase 2. Set NEXT_PUBLIC_MAP_PROVIDER=leaflet for the MVP.
      </div>
    );
  }

  return (
    <LeafletMapProvider
      className={className}
      fitToResultsKey={fitToResultsKey}
      initialViewport={viewport}
      locale={locale}
      onSelectProperty={onSelectProperty}
      points={points}
      selectedPropertyId={selectedPropertyId}
      tileSource={tileSource}
    />
  );
}
