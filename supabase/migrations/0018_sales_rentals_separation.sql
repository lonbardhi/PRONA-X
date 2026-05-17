do $$ begin
  create type public.property_transaction_type as enum ('sale', 'rent', 'rent_to_own');
exception
  when duplicate_object then null;
end $$;

alter type public.property_type add value if not exists 'shop';
alter type public.property_type add value if not exists 'warehouse';
alter type public.property_type add value if not exists 'hotel';
alter type public.property_type add value if not exists 'business';
alter type public.property_type add value if not exists 'development_project';
alter type public.property_type add value if not exists 'parking';
alter type public.property_type add value if not exists 'storage';
alter type public.property_type add value if not exists 'project_unit';

alter type public.property_status add value if not exists 'available';
alter type public.property_status add value if not exists 'viewing';
alter type public.property_status add value if not exists 'contract_active';
alter type public.property_status add value if not exists 'contract_expiring';

alter table public.properties
  add column if not exists transaction_type public.property_transaction_type not null default 'sale',
  add column if not exists asset_id uuid default gen_random_uuid(),
  add column if not exists linked_sale_property_id uuid references public.properties(id) on delete set null,
  add column if not exists linked_rental_property_id uuid references public.properties(id) on delete set null,
  add column if not exists rent_period text not null default 'monthly',
  add column if not exists available_from date,
  add column if not exists deposit_eur numeric(12, 2) check (deposit_eur is null or deposit_eur >= 0),
  add column if not exists minimum_lease_months integer check (minimum_lease_months is null or minimum_lease_months >= 0),
  add column if not exists maximum_lease_months integer check (maximum_lease_months is null or maximum_lease_months >= 0),
  add column if not exists furnished_state text,
  add column if not exists utilities_included boolean not null default false,
  add column if not exists sublease_allowed boolean not null default false,
  add column if not exists business_use_allowed boolean not null default false,
  add column if not exists price_on_request boolean not null default false;

update public.properties
set transaction_type = 'rent'
where status::text = 'rented'
  and transaction_type = 'sale';

update public.properties
set asset_id = id
where asset_id is null;

alter table public.properties
  alter column asset_id set default gen_random_uuid();

create index if not exists properties_transaction_type_idx on public.properties(transaction_type);
create index if not exists properties_asset_id_idx on public.properties(asset_id);
create index if not exists properties_available_from_idx on public.properties(available_from);

alter table public.properties
  drop constraint if exists properties_standard_sales_require_price,
  drop constraint if exists properties_rent_period_valid,
  drop constraint if exists properties_furnished_state_valid,
  drop constraint if exists properties_price_or_request_required,
  drop constraint if exists properties_lease_months_order,
  drop constraint if exists properties_linked_listing_not_self,
  drop constraint if exists properties_transaction_status_valid;

alter table public.properties
  add constraint properties_price_or_request_required
  check (
    type::text = 'development_land'
    or price_on_request
    or price_eur is not null
  )
  not valid,
  add constraint properties_rent_period_valid
  check (
    rent_period in ('daily', 'weekly', 'monthly', 'yearly', 'seasonal')
  )
  not valid,
  add constraint properties_furnished_state_valid
  check (
    furnished_state is null
    or furnished_state in ('furnished', 'partially_furnished', 'unfurnished', 'unknown')
  )
  not valid,
  add constraint properties_lease_months_order
  check (
    minimum_lease_months is null
    or maximum_lease_months is null
    or maximum_lease_months >= minimum_lease_months
  )
  not valid,
  add constraint properties_linked_listing_not_self
  check (
    (linked_sale_property_id is null or linked_sale_property_id <> id)
    and (linked_rental_property_id is null or linked_rental_property_id <> id)
  )
  not valid,
  add constraint properties_transaction_status_valid
  check (
    (
      transaction_type = 'sale'
      and type::text = 'development_land'
      and status::text in (
        'draft',
        'landowner_contacted',
        'documents_pending',
        'documents_verified',
        'feasibility_review',
        'ready_for_developers',
        'presented_to_developers',
        'developer_interested',
        'offer_received',
        'negotiation',
        'agreement_in_principle',
        'contract_drafting',
        'agreement_signed',
        'project_in_progress',
        'completed',
        'rejected',
        'withdrawn',
        'archived'
      )
    )
    or (
      transaction_type = 'sale'
      and type::text <> 'development_land'
      and status::text in (
        'draft',
        'published',
        'negotiation',
        'reserved',
        'sold',
        'landowner_contacted',
        'documents_pending',
        'documents_verified',
        'feasibility_review',
        'archived'
      )
    )
    or (
      transaction_type in ('rent', 'rent_to_own')
      and status::text in (
        'draft',
        'published',
        'available',
        'viewing',
        'reserved',
        'negotiation',
        'contract_drafting',
        'rented',
        'contract_active',
        'contract_expiring',
        'archived'
      )
    )
  )
  not valid;
