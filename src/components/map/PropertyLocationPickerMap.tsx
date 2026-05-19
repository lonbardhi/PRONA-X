"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

import { getDefaultMapViewport, getTileSourceConfig } from "@/lib/maps/config";
import { normalizeCoordinate } from "@/lib/maps/coordinates";
import type { LatLng } from "@/lib/maps/types";

const pickerIcon = L.divIcon({
  className: "",
  html: '<span class="prona-map-picker-marker"></span>',
  iconAnchor: [16, 32],
  iconSize: [32, 32],
});

function MapClickHandler({ onChange }: { onChange: (position: LatLng) => void }) {
  useMapEvents({
    click(event) {
      onChange({
        lat: Number(event.latlng.lat.toFixed(7)),
        lng: Number(event.latlng.lng.toFixed(7)),
      });
    },
  });

  return null;
}

function ResizeMap() {
  const map = useMap();

  useEffect(() => {
    const timeout = window.setTimeout(() => map.invalidateSize(), 80);

    return () => window.clearTimeout(timeout);
  }, [map]);

  return null;
}

export function PropertyLocationPickerMap({
  city,
  latitude,
  longitude,
  onChange,
}: {
  city?: string;
  latitude: string;
  longitude: string;
  onChange: (position: LatLng) => void;
}) {
  const tileSource = getTileSourceConfig();
  const viewport = getDefaultMapViewport();
  const selectedPosition = useMemo(() => {
    const lat = normalizeCoordinate(latitude);
    const lng = normalizeCoordinate(longitude);

    return lat == null || lng == null ? null : { lat, lng };
  }, [latitude, longitude]);
  const center = selectedPosition || viewport.center;

  return (
    <div className="grid gap-3">
      <div className="overflow-hidden rounded-xl border border-border">
        <MapContainer
          aria-label="Property location picker map"
          center={[center.lat, center.lng]}
          className="h-[360px] w-full"
          maxZoom={tileSource.maxZoom}
          minZoom={tileSource.minZoom}
          scrollWheelZoom
          zoom={selectedPosition ? 15 : viewport.zoom}
        >
          <TileLayer
            attribution={tileSource.attribution}
            maxZoom={tileSource.maxZoom}
            minZoom={tileSource.minZoom}
            url={tileSource.url}
          />
          <MapClickHandler onChange={onChange} />
          <ResizeMap />
          {selectedPosition ? (
            <Marker
              draggable
              eventHandlers={{
                dragend(event) {
                  const marker = event.target as L.Marker;
                  const latLng = marker.getLatLng();
                  onChange({
                    lat: Number(latLng.lat.toFixed(7)),
                    lng: Number(latLng.lng.toFixed(7)),
                  });
                },
              }}
              icon={pickerIcon}
              position={[selectedPosition.lat, selectedPosition.lng]}
            />
          ) : null}
        </MapContainer>
      </div>
      <p className="text-xs leading-5 text-slate-500">
        {city
          ? `Tip: center starts near Albania. Use the city field (${city}) as the operational reference if exact address is private.`
          : "Tip: click the map to set coordinates, then choose approximate display if the owner prefers privacy."}
      </p>
    </div>
  );
}
