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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-media',
  'property-media',
  true,
  104857600,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/pdf'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

select
  to_regclass('public.profiles') as profiles,
  to_regclass('public.properties') as properties,
  to_regclass('public.property_media') as property_media;
