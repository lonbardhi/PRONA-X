create table if not exists public.crm_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null,
  status text not null default 'new',
  customer_name text not null,
  phone text not null,
  phone_normalized text not null,
  email text,
  preferred_contact_method text not null default 'phone',
  source text not null default 'phone_call',
  source_details text,
  city text,
  area text,
  property_type text,
  min_budget_eur numeric(14, 2) check (min_budget_eur is null or min_budget_eur >= 0),
  max_budget_eur numeric(14, 2) check (max_budget_eur is null or max_budget_eur >= 0),
  rent_period text,
  bedrooms_min integer check (bedrooms_min is null or bedrooms_min >= 0),
  area_min_m2 numeric(10, 2) check (area_min_m2 is null or area_min_m2 >= 0),
  urgency text not null default 'warm',
  notes text,
  next_follow_up_at timestamptz,
  last_contacted_at timestamptz,
  matched_property_id uuid references public.properties(id) on delete set null,
  converted_property_id uuid references public.properties(id) on delete set null,
  assigned_agent_id uuid references public.profiles(id) on delete set null,
  assigned_agent_name text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_requests_type_check check (
    request_type in ('buyer', 'tenant', 'owner', 'investor')
  ),
  constraint crm_requests_status_check check (
    status in (
      'new',
      'contacted',
      'matching',
      'viewing',
      'offer',
      'converted',
      'nurture',
      'lost',
      'archived'
    )
  ),
  constraint crm_requests_source_check check (
    source in (
      'website',
      'whatsapp',
      'phone_call',
      'referral',
      'walk_in',
      'social',
      'existing_client',
      'other'
    )
  ),
  constraint crm_requests_contact_method_check check (
    preferred_contact_method in ('phone', 'whatsapp', 'email', 'in_person')
  ),
  constraint crm_requests_urgency_check check (
    urgency in ('hot', 'warm', 'cold')
  ),
  constraint crm_requests_rent_period_check check (
    rent_period is null
    or rent_period in ('daily', 'weekly', 'monthly', 'yearly', 'seasonal')
  ),
  constraint crm_requests_property_type_check check (
    property_type is null
    or property_type in (
      'apartment',
      'house',
      'villa',
      'land',
      'development_land',
      'commercial',
      'office',
      'shop',
      'warehouse',
      'hotel',
      'business',
      'development_project',
      'parking',
      'storage',
      'project_unit'
    )
  ),
  constraint crm_requests_budget_order_check check (
    min_budget_eur is null
    or max_budget_eur is null
    or max_budget_eur >= min_budget_eur
  ),
  constraint crm_requests_tenant_rent_period_check check (
    request_type <> 'tenant'
    or rent_period is not null
  )
);

create index if not exists crm_requests_type_idx
  on public.crm_requests(request_type);

create index if not exists crm_requests_status_idx
  on public.crm_requests(status);

create index if not exists crm_requests_phone_normalized_idx
  on public.crm_requests(phone_normalized);

create index if not exists crm_requests_assigned_agent_idx
  on public.crm_requests(assigned_agent_id);

create index if not exists crm_requests_next_follow_up_idx
  on public.crm_requests(next_follow_up_at);

create index if not exists crm_requests_created_at_idx
  on public.crm_requests(created_at desc);

create index if not exists crm_requests_city_idx
  on public.crm_requests(city);

drop trigger if exists set_crm_requests_updated_at on public.crm_requests;
create trigger set_crm_requests_updated_at
before update on public.crm_requests
for each row execute function public.set_updated_at();

alter table public.crm_requests enable row level security;

drop policy if exists "Approved users can view CRM requests" on public.crm_requests;
create policy "Approved users can view CRM requests"
on public.crm_requests for select
using (
  public.current_profile_role()::text in ('admin', 'manager', 'viewer')
  or created_by = auth.uid()
  or assigned_agent_id = auth.uid()
);

drop policy if exists "Operators can create CRM requests" on public.crm_requests;
create policy "Operators can create CRM requests"
on public.crm_requests for insert
with check (
  auth.uid() is not null
  and public.current_profile_role()::text in ('admin', 'manager', 'agent')
  and created_by = auth.uid()
);

drop policy if exists "Operators can update CRM requests" on public.crm_requests;
create policy "Operators can update CRM requests"
on public.crm_requests for update
using (
  public.current_profile_role()::text in ('admin', 'manager')
  or created_by = auth.uid()
  or assigned_agent_id = auth.uid()
)
with check (
  public.current_profile_role()::text in ('admin', 'manager')
  or created_by = auth.uid()
  or assigned_agent_id = auth.uid()
);

drop policy if exists "Managers can delete CRM requests" on public.crm_requests;
create policy "Managers can delete CRM requests"
on public.crm_requests for delete
using (
  public.current_profile_role()::text in ('admin', 'manager')
);

grant select, insert, update, delete on public.crm_requests to authenticated;

notify pgrst, 'reload schema';
