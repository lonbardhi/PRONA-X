create table if not exists public.seller_leads (
  id uuid primary key default gen_random_uuid(),
  seller_name text not null,
  phone text not null,
  phone_normalized text not null,
  seller_email text,
  preferred_contact_method text not null default 'phone',
  status text not null default 'new',
  source text not null,
  source_details text,
  property_type text,
  city text,
  area text,
  address text,
  expected_price numeric(14, 2) check (expected_price is null or expected_price >= 0),
  currency text not null default 'EUR',
  timeline text,
  ownership_confirmed boolean not null default false,
  documents_collected boolean not null default false,
  photos_collected boolean not null default false,
  valuation_requested boolean not null default false,
  asking_reason text,
  external_listing_url text,
  quality_score integer not null default 0 check (quality_score >= 0 and quality_score <= 100),
  temperature text not null default 'cold',
  next_follow_up_at timestamptz,
  last_contacted_at timestamptz,
  lost_reason text,
  nurture_reason text,
  converted_property_id uuid references public.properties(id) on delete set null,
  assigned_agent_id uuid references public.profiles(id) on delete set null,
  assigned_agent_name text,
  seller_notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_leads_status_check check (
    status in (
      'new',
      'contacted',
      'qualified',
      'listing_preparation',
      'manager_review',
      'converted',
      'nurture',
      'lost'
    )
  ),
  constraint seller_leads_source_check check (
    source in (
      'website',
      'referral',
      'facebook',
      'instagram',
      'whatsapp',
      'phone_call',
      'walk_in',
      'valuation_request',
      'external_listing',
      'expired_listing',
      'existing_client',
      'other'
    )
  ),
  constraint seller_leads_property_type_check check (
    property_type is null
    or property_type in (
      'apartment',
      'house',
      'villa',
      'land',
      'development_land',
      'commercial',
      'office',
      'other'
    )
  ),
  constraint seller_leads_timeline_check check (
    timeline is null
    or timeline in (
      'immediately',
      'one_month',
      'one_to_three_months',
      'three_to_six_months',
      'six_plus_months',
      'not_sure'
    )
  ),
  constraint seller_leads_contact_method_check check (
    preferred_contact_method in ('phone', 'whatsapp', 'email', 'in_person')
  ),
  constraint seller_leads_temperature_check check (
    temperature in ('hot', 'warm', 'cold')
  )
);

create index if not exists seller_leads_phone_normalized_idx
  on public.seller_leads(phone_normalized);

create index if not exists seller_leads_status_idx
  on public.seller_leads(status);

create index if not exists seller_leads_source_idx
  on public.seller_leads(source);

create index if not exists seller_leads_temperature_idx
  on public.seller_leads(temperature);

create index if not exists seller_leads_assigned_agent_idx
  on public.seller_leads(assigned_agent_id);

create index if not exists seller_leads_next_follow_up_idx
  on public.seller_leads(next_follow_up_at);

create index if not exists seller_leads_created_at_idx
  on public.seller_leads(created_at desc);

drop trigger if exists set_seller_leads_updated_at on public.seller_leads;
create trigger set_seller_leads_updated_at
before update on public.seller_leads
for each row execute function public.set_updated_at();

alter table public.seller_leads enable row level security;

drop policy if exists "Operators can view seller leads" on public.seller_leads;
create policy "Operators can view seller leads"
on public.seller_leads for select
using (
  public.current_profile_role() in ('admin', 'manager')
  or created_by = auth.uid()
  or assigned_agent_id = auth.uid()
);

drop policy if exists "Operators can create seller leads" on public.seller_leads;
create policy "Operators can create seller leads"
on public.seller_leads for insert
with check (
  auth.uid() is not null
  and public.current_profile_role() in ('admin', 'manager', 'agent')
  and created_by = auth.uid()
);

drop policy if exists "Operators can update seller leads" on public.seller_leads;
create policy "Operators can update seller leads"
on public.seller_leads for update
using (
  public.current_profile_role() in ('admin', 'manager')
  or created_by = auth.uid()
  or assigned_agent_id = auth.uid()
)
with check (
  public.current_profile_role() in ('admin', 'manager')
  or created_by = auth.uid()
  or assigned_agent_id = auth.uid()
);

drop policy if exists "Managers can delete seller leads" on public.seller_leads;
create policy "Managers can delete seller leads"
on public.seller_leads for delete
using (
  public.current_profile_role() in ('admin', 'manager')
  or created_by = auth.uid()
);

grant select, insert, update, delete on public.seller_leads to authenticated;

notify pgrst, 'reload schema';

