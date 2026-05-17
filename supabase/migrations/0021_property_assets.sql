create table if not exists public.property_assets (
  id uuid primary key default gen_random_uuid(),
  canonical_property_id uuid references public.properties(id) on delete set null,
  asset_type public.property_type not null,
  title text not null,
  city text not null,
  neighborhood text,
  address text,
  area_m2 numeric(10, 2) check (area_m2 is null or area_m2 >= 0),
  plot_size_m2 numeric(10, 2) check (plot_size_m2 is null or plot_size_m2 >= 0),
  owner_name text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

update public.properties
set asset_id = gen_random_uuid()
where asset_id is null;

insert into public.property_assets (
  id,
  canonical_property_id,
  asset_type,
  title,
  city,
  neighborhood,
  address,
  area_m2,
  plot_size_m2,
  created_by,
  created_at,
  updated_at
)
select distinct on (p.asset_id)
  p.asset_id,
  p.id,
  p.type,
  p.title,
  p.city,
  p.neighborhood,
  p.address,
  p.area_m2,
  p.plot_size_m2,
  p.created_by,
  p.created_at,
  p.updated_at
from public.properties p
where p.asset_id is not null
order by p.asset_id, p.created_at asc
on conflict (id) do nothing;

create index if not exists property_assets_canonical_property_idx
  on public.property_assets(canonical_property_id);

create index if not exists property_assets_city_idx
  on public.property_assets(city);

create index if not exists property_assets_type_idx
  on public.property_assets(asset_type);

drop trigger if exists set_property_assets_updated_at on public.property_assets;
create trigger set_property_assets_updated_at
before update on public.property_assets
for each row execute function public.set_updated_at();

create or replace function public.ensure_property_asset_from_listing()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.asset_id is null then
    new.asset_id := gen_random_uuid();
  end if;

  insert into public.property_assets (
    id,
    canonical_property_id,
    asset_type,
    title,
    city,
    neighborhood,
    address,
    area_m2,
    plot_size_m2,
    created_by
  )
  values (
    new.asset_id,
    new.id,
    new.type,
    new.title,
    new.city,
    new.neighborhood,
    new.address,
    new.area_m2,
    new.plot_size_m2,
    new.created_by
  )
  on conflict (id) do update
  set
    asset_type = excluded.asset_type,
    title = case
      when public.property_assets.canonical_property_id = new.id
      then excluded.title
      else public.property_assets.title
    end,
    city = excluded.city,
    neighborhood = excluded.neighborhood,
    address = excluded.address,
    area_m2 = excluded.area_m2,
    plot_size_m2 = excluded.plot_size_m2,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists ensure_property_asset_from_listing on public.properties;
create trigger ensure_property_asset_from_listing
before insert or update of
  asset_id,
  type,
  title,
  city,
  neighborhood,
  address,
  area_m2,
  plot_size_m2
on public.properties
for each row execute function public.ensure_property_asset_from_listing();

alter table public.properties
  drop constraint if exists properties_asset_id_fkey,
  add constraint properties_asset_id_fkey
  foreign key (asset_id)
  references public.property_assets(id)
  on delete restrict
  not valid;

alter table public.property_assets enable row level security;

drop policy if exists "Property assets follow listing visibility" on public.property_assets;
create policy "Property assets follow listing visibility"
on public.property_assets for select
using (
  exists (
    select 1 from public.properties p
    where p.asset_id = property_assets.id
    and (
      p.status = 'published'
      or public.current_profile_role()::text in ('admin', 'manager')
      or p.created_by = auth.uid()
      or p.assigned_agent_id = auth.uid()
    )
  )
);

drop policy if exists "Operators can create property assets" on public.property_assets;
create policy "Operators can create property assets"
on public.property_assets for insert
with check (
  auth.uid() is not null
  and public.current_profile_role()::text in ('admin', 'manager', 'agent')
  and created_by = auth.uid()
);

drop policy if exists "Operators can update accessible property assets" on public.property_assets;
create policy "Operators can update accessible property assets"
on public.property_assets for update
using (
  exists (
    select 1 from public.properties p
    where p.asset_id = property_assets.id
    and (
      public.current_profile_role()::text in ('admin', 'manager')
      or p.created_by = auth.uid()
      or p.assigned_agent_id = auth.uid()
    )
  )
)
with check (
  exists (
    select 1 from public.properties p
    where p.asset_id = property_assets.id
    and (
      public.current_profile_role()::text in ('admin', 'manager')
      or p.created_by = auth.uid()
      or p.assigned_agent_id = auth.uid()
    )
  )
);

drop policy if exists "Managers can delete property assets" on public.property_assets;
create policy "Managers can delete property assets"
on public.property_assets for delete
using (
  public.current_profile_role()::text in ('admin', 'manager')
);

grant select, insert, update, delete on public.property_assets to authenticated;

notify pgrst, 'reload schema';
