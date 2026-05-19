"use client";

import { useEffect } from "react";
import { useMap, useMapEvents } from "react-leaflet";

import type { LatLng, MapViewport } from "@/lib/maps/types";

type Bounds = {
  east: number;
  north: number;
  south: number;
  west: number;
} | null;

export function InteractionLayer({
  bounds,
  fitToResultsKey,
  onViewportChange,
  selectedPoint,
}: {
  bounds: Bounds;
  fitToResultsKey?: string;
  onViewportChange?: (viewport: MapViewport) => void;
  selectedPoint?: LatLng | null;
}) {
  const map = useMap();

  useMapEvents({
    moveend() {
      if (!onViewportChange) {
        return;
      }

      const center = map.getCenter();
      const mapBounds = map.getBounds();

      onViewportChange({
        bounds: {
          east: mapBounds.getEast(),
          north: mapBounds.getNorth(),
          south: mapBounds.getSouth(),
          west: mapBounds.getWest(),
        },
        center: { lat: center.lat, lng: center.lng },
        zoom: map.getZoom(),
      });
    },
  });

  useEffect(() => {
    map.invalidateSize();
  }, [map]);

  useEffect(() => {
    if (selectedPoint) {
      map.panTo([selectedPoint.lat, selectedPoint.lng], { animate: true });
    }
  }, [map, selectedPoint]);

  useEffect(() => {
    if (!bounds) {
      return;
    }

    if (bounds.north === bounds.south && bounds.east === bounds.west) {
      map.setView([bounds.north, bounds.east], Math.max(map.getZoom(), 14), {
        animate: true,
      });
      return;
    }

    map.fitBounds(
      [
        [bounds.south, bounds.west],
        [bounds.north, bounds.east],
      ],
      { animate: true, maxZoom: 15, padding: [32, 32] },
    );
  }, [bounds, fitToResultsKey, map]);

  return null;
}
