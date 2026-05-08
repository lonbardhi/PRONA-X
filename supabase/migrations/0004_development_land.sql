alter type public.property_type add value if not exists 'development_land';

alter type public.property_status add value if not exists 'landowner_contacted';
alter type public.property_status add value if not exists 'documents_pending';
alter type public.property_status add value if not exists 'documents_verified';
alter type public.property_status add value if not exists 'feasibility_review';
alter type public.property_status add value if not exists 'ready_for_developers';
alter type public.property_status add value if not exists 'presented_to_developers';
alter type public.property_status add value if not exists 'developer_interested';
alter type public.property_status add value if not exists 'offer_received';
alter type public.property_status add value if not exists 'negotiation';
alter type public.property_status add value if not exists 'agreement_in_principle';
alter type public.property_status add value if not exists 'contract_drafting';
alter type public.property_status add value if not exists 'agreement_signed';
alter type public.property_status add value if not exists 'project_in_progress';
alter type public.property_status add value if not exists 'completed';
alter type public.property_status add value if not exists 'rejected';
alter type public.property_status add value if not exists 'withdrawn';

alter table public.properties
  alter column price_eur drop not null;

alter table public.properties
  add column if not exists plot_size_m2 numeric(12, 2) check (plot_size_m2 is null or plot_size_m2 >= 0),
  add column if not exists land_certificate_number text,
  add column if not exists cadastral_zone text,
  add column if not exists parcel_number text,
  add column if not exists ownership_status text,
  add column if not exists landowners_count integer check (landowners_count is null or landowners_count >= 0),
  add column if not exists current_land_use text,
  add column if not exists development_zone text,
  add column if not exists building_coefficient numeric(8, 3) check (building_coefficient is null or building_coefficient >= 0),
  add column if not exists max_floors integer check (max_floors is null or max_floors >= 0),
  add column if not exists estimated_gross_buildable_area_m2 numeric(12, 2) check (estimated_gross_buildable_area_m2 is null or estimated_gross_buildable_area_m2 >= 0),
  add column if not exists estimated_net_sellable_area_m2 numeric(12, 2) check (estimated_net_sellable_area_m2 is null or estimated_net_sellable_area_m2 >= 0),
  add column if not exists estimated_apartments integer check (estimated_apartments is null or estimated_apartments >= 0),
  add column if not exists estimated_garages integer check (estimated_garages is null or estimated_garages >= 0),
  add column if not exists estimated_parking_spaces integer check (estimated_parking_spaces is null or estimated_parking_spaces >= 0),
  add column if not exists estimated_commercial_units integer check (estimated_commercial_units is null or estimated_commercial_units >= 0),
  add column if not exists road_access text,
  add column if not exists utilities_access text,
  add column if not exists planning_permission_status text,
  add column if not exists construction_permit_status text,
  add column if not exists urban_study_status text,
  add column if not exists landowner_requested_percentage numeric(5, 2) check (landowner_requested_percentage is null or (landowner_requested_percentage >= 0 and landowner_requested_percentage <= 100)),
  add column if not exists minimum_acceptable_percentage numeric(5, 2) check (minimum_acceptable_percentage is null or (minimum_acceptable_percentage >= 0 and minimum_acceptable_percentage <= 100)),
  add column if not exists preferred_compensation_type text,
  add column if not exists preferred_floor_allocation text,
  add column if not exists preferred_unit_orientation text,
  add column if not exists agreement_notes text,
  add column if not exists negotiation_status text,
  add column if not exists developer_name text,
  add column if not exists developer_contact text,
  add column if not exists developer_offered_percentage numeric(5, 2) check (developer_offered_percentage is null or (developer_offered_percentage >= 0 and developer_offered_percentage <= 100)),
  add column if not exists developer_proposed_project_size text,
  add column if not exists developer_proposed_delivery_timeline text,
  add column if not exists developer_proposed_unit_allocation text,
  add column if not exists developer_conditions text,
  add column if not exists developer_offer_status text,
  add column if not exists visibility text not null default 'internal_only';

alter table public.properties
  alter column visibility set default 'internal_only';

update public.properties
set visibility = 'internal_only'
where visibility is null;

alter table public.properties
  alter column visibility set not null;

alter table public.properties
  drop constraint if exists properties_standard_sales_require_price,
  drop constraint if exists properties_development_land_min_percentage,
  drop constraint if exists properties_development_land_plot_required_after_draft;

alter table public.properties
  add constraint properties_standard_sales_require_price
  check (type::text = 'development_land' or price_eur is not null)
  not valid,
  add constraint properties_development_land_min_percentage
  check (
    minimum_acceptable_percentage is null
    or landowner_requested_percentage is null
    or minimum_acceptable_percentage <= landowner_requested_percentage
  )
  not valid,
  add constraint properties_development_land_plot_required_after_draft
  check (
    type::text <> 'development_land'
    or status::text = 'draft'
    or plot_size_m2 is not null
  )
  not valid;
