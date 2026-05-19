"use client";

import { useEffect } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import { useMap } from "react-leaflet";

import type { PropertyMapPoint } from "@/lib/maps/types";

function getMarkerClass(point: PropertyMapPoint, selected: boolean) {
  const toneClass: Record<PropertyMapPoint["markerTone"], string> = {
    development: "prona-map-marker-development",
    inactive: "prona-map-marker-inactive",
    rent: "prona-map-marker-rent",
    sale: "prona-map-marker-sale",
  };

  return [
    "prona-map-marker",
    toneClass[point.markerTone],
    selected ? "prona-map-marker-selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function createPropertyIcon(point: PropertyMapPoint, selected: boolean) {
  return L.divIcon({
    className: "",
    html: `<span class="${getMarkerClass(point, selected)}"><span>${point.price_eur ? "€" : "PX"}</span></span>`,
    iconAnchor: [18, 18],
    iconSize: [36, 36],
  });
}

function createClusterIcon(cluster: L.MarkerCluster) {
  const count = cluster.getChildCount();

  return L.divIcon({
    className: "",
    html: `<span class="prona-map-cluster">${count}</span>`,
    iconAnchor: [22, 22],
    iconSize: [44, 44],
  });
}

export function PropertyMarkerLayer({
  onSelectProperty,
  points,
  selectedPropertyId,
}: {
  onSelectProperty?: (property: PropertyMapPoint | null) => void;
  points: PropertyMapPoint[];
  selectedPropertyId?: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({
      iconCreateFunction: createClusterIcon,
      maxClusterRadius: 56,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
    });

    for (const point of points) {
      const marker = L.marker([point.position.lat, point.position.lng], {
        icon: createPropertyIcon(point, point.id === selectedPropertyId),
        keyboard: true,
        title: point.title,
      });

      marker.on("click", () => {
        onSelectProperty?.(point);
      });

      clusterGroup.addLayer(marker);
    }

    map.addLayer(clusterGroup);

    return () => {
      map.removeLayer(clusterGroup);
      clusterGroup.clearLayers();
    };
  }, [map, onSelectProperty, points, selectedPropertyId]);

  return null;
}
