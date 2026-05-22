create table if not exists public.listing_marketing_assets (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.properties(id) on delete cascade,
  workspace_id uuid null,
  asset_type text not null check (
    asset_type in (
      'pdf',
      'ai_description',
      'whatsapp_message',
      'quality_check'
    )
  ),
  status text not null default 'generated' check (
    status in ('draft', 'generated', 'saved', 'failed', 'archived')
  ),
  language text null,
  title text null,
  content_text text null,
  content_json jsonb not null default '{}'::jsonb,
  bucket_id text null,
  file_path text null,
  file_url text null,
  template_key text null,
  generated_by_user_id uuid null references public.profiles(id) on delete set null default auth.uid(),
  approved_by_user_id uuid null references public.profiles(id) on delete set null,
  approved_at timestamptz null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists idx_listing_marketing_assets_listing_id
on public.listing_marketing_assets (listing_id);

create index if not exists idx_listing_marketing_assets_asset_type
on public.listing_marketing_assets (asset_type);

create index if not exists idx_listing_marketing_assets_generated_by
on public.listing_marketing_assets (generated_by_user_id);

create index if not exists idx_listing_marketing_assets_created_at
on public.listing_marketing_assets (created_at desc);

create index if not exists idx_listing_marketing_assets_active_listing
on public.listing_marketing_assets (listing_id, created_at desc)
where deleted_at is null;

create or replace function public.set_listing_marketing_assets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_listing_marketing_assets_updated_at
on public.listing_marketing_assets;

create trigger set_listing_marketing_assets_updated_at
before update on public.listing_marketing_assets
for each row
execute function public.set_listing_marketing_assets_updated_at();

alter table public.listing_marketing_assets enable row level security;

drop policy if exists "Operators can read listing marketing assets"
on public.listing_marketing_assets;

create policy "Operators can read listing marketing assets"
on public.listing_marketing_assets for select
using (
  deleted_at is null
  and auth.uid() is not null
  and public.current_profile_role()::text in ('admin', 'manager', 'agent')
  and exists (
    select 1
    from public.properties property
    where property.id = listing_marketing_assets.listing_id
      and (
        public.current_profile_role()::text in ('admin', 'manager')
        or property.created_by = auth.uid()
        or property.assigned_agent_id = auth.uid()
      )
  )
);

drop policy if exists "Operators can create listing marketing assets"
on public.listing_marketing_assets;

create policy "Operators can create listing marketing assets"
on public.listing_marketing_assets for insert
with check (
  auth.uid() is not null
  and public.current_profile_role()::text in ('admin', 'manager', 'agent')
  and coalesce(generated_by_user_id, auth.uid()) = auth.uid()
  and exists (
    select 1
    from public.properties property
    where property.id = listing_marketing_assets.listing_id
      and (
        public.current_profile_role()::text in ('admin', 'manager')
        or property.created_by = auth.uid()
        or property.assigned_agent_id = auth.uid()
      )
  )
);

drop policy if exists "Operators can update own listing marketing assets"
on public.listing_marketing_assets;

create policy "Operators can update own listing marketing assets"
on public.listing_marketing_assets for update
using (
  auth.uid() is not null
  and public.current_profile_role()::text in ('admin', 'manager', 'agent')
  and exists (
    select 1
    from public.properties property
    where property.id = listing_marketing_assets.listing_id
      and (
        public.current_profile_role()::text in ('admin', 'manager')
        or property.created_by = auth.uid()
        or property.assigned_agent_id = auth.uid()
      )
  )
)
with check (
  auth.uid() is not null
  and public.current_profile_role()::text in ('admin', 'manager', 'agent')
  and exists (
    select 1
    from public.properties property
    where property.id = listing_marketing_assets.listing_id
      and (
        public.current_profile_role()::text in ('admin', 'manager')
        or property.created_by = auth.uid()
        or property.assigned_agent_id = auth.uid()
      )
  )
);

grant select, insert, update on public.listing_marketing_assets to authenticated;
