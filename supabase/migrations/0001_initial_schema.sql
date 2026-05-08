create extension if not exists "pgcrypto";

do $$ begin
  create type public.app_role as enum ('admin', 'manager', 'agent', 'viewer');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.property_status as enum ('draft', 'published', 'reserved', 'sold', 'rented', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.property_type as enum ('apartment', 'house', 'villa', 'land', 'commercial', 'office');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role public.app_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  type public.property_type not null,
  status public.property_status not null default 'draft',
  city text not null,
  neighborhood text,
  address text,
  price_eur numeric(12, 2) not null check (price_eur >= 0),
  bedrooms integer check (bedrooms >= 0),
  bathrooms integer check (bathrooms >= 0),
  area_m2 numeric(10, 2) check (area_m2 >= 0),
  year_built integer check (year_built is null or year_built between 1800 and 2100),
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  assigned_agent_id uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.property_media (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  bucket_id text not null default 'property-media',
  storage_path text not null,
  public_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_by uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  unique (bucket_id, storage_path)
);

create index if not exists properties_city_idx on public.properties(city);
create index if not exists properties_status_idx on public.properties(status);
create index if not exists properties_type_idx on public.properties(type);
create index if not exists properties_created_by_idx on public.properties(created_by);
create index if not exists properties_assigned_agent_idx on public.properties(assigned_agent_id);
create index if not exists property_media_property_idx on public.property_media(property_id);
create index if not exists properties_search_idx on public.properties using gin (
  to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(city, '') || ' ' || coalesce(neighborhood, '') || ' ' || coalesce(description, ''))
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_properties_updated_at on public.properties;
create trigger set_properties_updated_at
before update on public.properties
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_profile_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_media enable row level security;

drop policy if exists "Profiles are visible to self and operators" on public.profiles;
create policy "Profiles are visible to self and operators"
on public.profiles for select
using (
  id = auth.uid()
  or public.current_profile_role() in ('admin', 'manager')
);

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles"
on public.profiles for all
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

drop policy if exists "Published properties are public" on public.properties;
create policy "Published properties are public"
on public.properties for select
using (status = 'published');

drop policy if exists "Operators can view assigned portfolio" on public.properties;
create policy "Operators can view assigned portfolio"
on public.properties for select
using (
  auth.uid() is not null
  and (
    public.current_profile_role() in ('admin', 'manager')
    or created_by = auth.uid()
    or assigned_agent_id = auth.uid()
  )
);

drop policy if exists "Operators can create properties" on public.properties;
create policy "Operators can create properties"
on public.properties for insert
with check (
  auth.uid() is not null
  and public.current_profile_role() in ('admin', 'manager', 'agent')
  and created_by = auth.uid()
);

drop policy if exists "Operators can update their portfolio" on public.properties;
create policy "Operators can update their portfolio"
on public.properties for update
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

drop policy if exists "Operators can delete their portfolio" on public.properties;
create policy "Operators can delete their portfolio"
on public.properties for delete
using (
  public.current_profile_role() in ('admin', 'manager')
  or created_by = auth.uid()
);

drop policy if exists "Media follows property visibility" on public.property_media;
create policy "Media follows property visibility"
on public.property_media for select
using (
  exists (
    select 1 from public.properties p
    where p.id = property_id
    and (
      p.status = 'published'
      or public.current_profile_role() in ('admin', 'manager')
      or p.created_by = auth.uid()
      or p.assigned_agent_id = auth.uid()
    )
  )
);

drop policy if exists "Operators can add property media" on public.property_media;
create policy "Operators can add property media"
on public.property_media for insert
with check (
  auth.uid() is not null
  and created_by = auth.uid()
  and exists (
    select 1 from public.properties p
    where p.id = property_id
    and (
      public.current_profile_role() in ('admin', 'manager')
      or p.created_by = auth.uid()
      or p.assigned_agent_id = auth.uid()
    )
  )
);

drop policy if exists "Operators can delete property media" on public.property_media;
create policy "Operators can delete property media"
on public.property_media for delete
using (
  exists (
    select 1 from public.properties p
    where p.id = property_id
    and (
      public.current_profile_role() in ('admin', 'manager')
      or p.created_by = auth.uid()
      or p.assigned_agent_id = auth.uid()
    )
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-media',
  'property-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public property media is readable" on storage.objects;
create policy "Public property media is readable"
on storage.objects for select
using (bucket_id = 'property-media');

drop policy if exists "Authenticated users can upload property media" on storage.objects;
create policy "Authenticated users can upload property media"
on storage.objects for insert
with check (
  bucket_id = 'property-media'
  and auth.uid() is not null
);

drop policy if exists "Authenticated users can update property media" on storage.objects;
create policy "Authenticated users can update property media"
on storage.objects for update
using (
  bucket_id = 'property-media'
  and auth.uid() is not null
)
with check (
  bucket_id = 'property-media'
  and auth.uid() is not null
);

drop policy if exists "Authenticated users can delete property media" on storage.objects;
create policy "Authenticated users can delete property media"
on storage.objects for delete
using (
  bucket_id = 'property-media'
  and auth.uid() is not null
);

