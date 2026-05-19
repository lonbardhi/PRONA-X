"use client";

import { TileLayer } from "react-leaflet";

import type { TileSourceConfig } from "@/lib/maps/types";

export function LeafletTileLayer({
  onTileError,
  tileSource,
}: {
  onTileError?: () => void;
  tileSource: TileSourceConfig;
}) {
  return (
    <TileLayer
      attribution={tileSource.attribution}
      eventHandlers={{ tileerror: onTileError }}
      maxZoom={tileSource.maxZoom}
      minZoom={tileSource.minZoom}
      url={tileSource.url}
    />
  );
}
