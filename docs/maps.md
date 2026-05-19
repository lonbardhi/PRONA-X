# PRONA X Maps

PRONA X uses Leaflet for the Phase 1 property map/list MVP. The default tile source is public OpenStreetMap raster tiles and is temporary for internal testing only.

## Environment

- `NEXT_PUBLIC_MAP_ENABLED=true`
- `NEXT_PUBLIC_MAP_PROVIDER=leaflet`
- `NEXT_PUBLIC_TILE_SOURCE=osm-raster`
- `NEXT_PUBLIC_OSM_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- `NEXT_PUBLIC_TILE_ATTRIBUTION=© OpenStreetMap contributors`
- `NEXT_PUBLIC_MAP_DEFAULT_CENTER_LAT=41.1533`
- `NEXT_PUBLIC_MAP_DEFAULT_CENTER_LNG=20.1683`
- `NEXT_PUBLIC_MAP_DEFAULT_ZOOM=7`
- `NEXT_PUBLIC_MAP_MIN_ZOOM=6`
- `NEXT_PUBLIC_MAP_MAX_ZOOM=19`

Do not scrape, prefetch, bulk download, or offline-cache public OSM tiles.

## Phase 2 Direction

Production should move to self-hosted Albania/regional OSM-derived tiles. The preferred path is Protomaps PMTiles:

- Host only Albania/regional extracts, not world tiles.
- Ensure attribution and license compliance.
- Ensure the storage/CDN supports range requests and CORS.
- For vector PMTiles, add a MapLibre provider while preserving `PropertyMapPoint`, filters, cards, and list synchronization.
- For raster PMTiles or custom raster tiles, extend `TileSourceConfig` without changing the property UI.

The current map UI keeps Leaflet-specific code inside `src/components/map/providers` and `src/components/map/layers`.

## Coordinate Privacy

Exact coordinates are stored in `properties.latitude` and `properties.longitude`. Approximate listings set `location_is_approximate=true`.

Map payloads use `getDisplaySafeCoordinate()` and return only `position`. Unauthorized map consumers do not receive `latitude` or `longitude` for approximate listings. Approximate display coordinates are stable because they are rounded and offset deterministically by property ID.

## Backfill

Dry-run first:

```bash
pnpm maps:backfill:dry-run
```

Commit missing coordinates using city centroids:

```bash
pnpm maps:backfill
```

Optional filters:

```bash
node scripts/backfill-property-coordinates.mjs --property-id=<uuid>
node scripts/backfill-property-coordinates.mjs --city=Tiranë
node scripts/backfill-property-coordinates.mjs --commit --overwrite
```

The script does not call external geocoders. City centroid matches are marked approximate with low confidence and do not overwrite existing coordinates unless `--overwrite` is provided.
