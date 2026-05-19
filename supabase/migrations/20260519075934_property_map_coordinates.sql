alter table public.properties
  add column if not exists location_is_approximate boolean not null default false,
  add column if not exists coordinate_source text,
  add column if not exists coordinate_confidence text,
  add column if not exists coordinates_updated_at timestamptz;

alter table public.properties
  drop constraint if exists properties_latitude_range_check,
  drop constraint if exists properties_longitude_range_check,
  drop constraint if exists properties_coordinate_pair_check,
  drop constraint if exists properties_coordinate_source_check,
  drop constraint if exists properties_coordinate_confidence_check;

alter table public.properties
  add constraint properties_latitude_range_check
    check (latitude is null or (latitude >= -90 and latitude <= 90)),
  add constraint properties_longitude_range_check
    check (longitude is null or (longitude >= -180 and longitude <= 180)),
  add constraint properties_coordinate_pair_check
    check ((latitude is null and longitude is null) or (latitude is not null and longitude is not null)),
  add constraint properties_coordinate_source_check
    check (
      coordinate_source is null
      or coordinate_source in (
        'manual',
        'map_picker',
        'city_centroid',
        'address_geocode',
        'imported_csv',
        'backfill',
        'unknown'
      )
    ),
  add constraint properties_coordinate_confidence_check
    check (
      coordinate_confidence is null
      or coordinate_confidence in ('exact', 'high', 'medium', 'low', 'unknown')
    );

create index if not exists properties_mappable_coordinates_idx
  on public.properties(latitude, longitude)
  where latitude is not null and longitude is not null;

create index if not exists properties_location_approximate_idx
  on public.properties(location_is_approximate)
  where location_is_approximate = true;
