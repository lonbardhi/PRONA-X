update public.properties
set assigned_agent_id = created_by
where assigned_agent_id is null
  and created_by is not null;

alter table public.properties
  drop constraint if exists properties_live_listing_requires_assigned_agent;

alter table public.properties
  add constraint properties_live_listing_requires_assigned_agent
  check (
    status::text in ('draft', 'archived')
    or assigned_agent_id is not null
  )
  not valid;
