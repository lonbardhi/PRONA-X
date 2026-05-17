create table if not exists public.crm_request_matches (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.crm_requests(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  match_status text not null default 'suggested',
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles(id) on delete set null,
  sent_at timestamptz,
  converted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_request_matches_status_check check (
    match_status in ('suggested', 'sent', 'viewing', 'offer', 'converted', 'rejected')
  ),
  constraint crm_request_matches_unique_pair unique (request_id, property_id)
);

create index if not exists crm_request_matches_request_idx
  on public.crm_request_matches(request_id);

create index if not exists crm_request_matches_property_idx
  on public.crm_request_matches(property_id);

create index if not exists crm_request_matches_status_idx
  on public.crm_request_matches(match_status);

drop trigger if exists set_crm_request_matches_updated_at on public.crm_request_matches;
create trigger set_crm_request_matches_updated_at
before update on public.crm_request_matches
for each row execute function public.set_updated_at();

alter table public.crm_request_matches enable row level security;

drop policy if exists "Approved users can view CRM request matches" on public.crm_request_matches;
create policy "Approved users can view CRM request matches"
on public.crm_request_matches for select
using (
  public.current_profile_role()::text in ('admin', 'manager', 'viewer')
  or exists (
    select 1
    from public.crm_requests r
    where r.id = request_id
      and (r.created_by = auth.uid() or r.assigned_agent_id = auth.uid())
  )
);

drop policy if exists "Operators can create CRM request matches" on public.crm_request_matches;
create policy "Operators can create CRM request matches"
on public.crm_request_matches for insert
with check (
  auth.uid() is not null
  and public.current_profile_role()::text in ('admin', 'manager', 'agent')
  and created_by = auth.uid()
);

drop policy if exists "Operators can update CRM request matches" on public.crm_request_matches;
create policy "Operators can update CRM request matches"
on public.crm_request_matches for update
using (
  public.current_profile_role()::text in ('admin', 'manager')
  or exists (
    select 1
    from public.crm_requests r
    where r.id = request_id
      and (r.created_by = auth.uid() or r.assigned_agent_id = auth.uid())
  )
)
with check (
  public.current_profile_role()::text in ('admin', 'manager')
  or exists (
    select 1
    from public.crm_requests r
    where r.id = request_id
      and (r.created_by = auth.uid() or r.assigned_agent_id = auth.uid())
  )
);

drop policy if exists "Managers can delete CRM request matches" on public.crm_request_matches;
create policy "Managers can delete CRM request matches"
on public.crm_request_matches for delete
using (
  public.current_profile_role()::text in ('admin', 'manager')
);

grant select, insert, update, delete on public.crm_request_matches to authenticated;

notify pgrst, 'reload schema';
