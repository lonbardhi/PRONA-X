do $$ begin
  create type public.support_ticket_category as enum (
    'technical_issue',
    'property_listing_issue',
    'image_media_upload_issue',
    'calendar_appointment_issue',
    'sales_workflow_issue',
    'rental_workflow_issue',
    'seller_lead_issue',
    'user_account_issue',
    'permission_access_issue',
    'feature_request',
    'data_correction_request',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.support_ticket_priority as enum (
    'low',
    'medium',
    'high',
    'critical'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.support_ticket_status as enum (
    'open',
    'in_review',
    'waiting_for_user',
    'in_progress',
    'resolved',
    'closed',
    'rejected'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  title text not null,
  category public.support_ticket_category not null,
  priority public.support_ticket_priority not null default 'medium',
  status public.support_ticket_status not null default 'open',
  related_module text,
  related_property_id uuid references public.properties(id) on delete set null,
  description text not null,
  steps_to_reproduce text,
  page_url text,
  browser text,
  device text,
  os text,
  screen_size text,
  created_by uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  assigned_to uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  body text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.support_ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  message_id uuid references public.support_ticket_messages(id) on delete cascade,
  bucket_id text not null default 'support-attachments',
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size integer not null check (file_size >= 0),
  is_internal boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  unique (bucket_id, storage_path)
);

create table if not exists public.support_ticket_activity (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null default auth.uid(),
  activity_type text not null,
  from_value text,
  to_value text,
  body text,
  created_at timestamptz not null default now()
);

create index if not exists support_tickets_created_by_idx on public.support_tickets(created_by);
create index if not exists support_tickets_assigned_to_idx on public.support_tickets(assigned_to);
create index if not exists support_tickets_status_idx on public.support_tickets(status);
create index if not exists support_tickets_priority_idx on public.support_tickets(priority);
create index if not exists support_tickets_category_idx on public.support_tickets(category);
create index if not exists support_tickets_created_at_idx on public.support_tickets(created_at);
create index if not exists support_ticket_messages_ticket_idx on public.support_ticket_messages(ticket_id);
create index if not exists support_ticket_attachments_ticket_idx on public.support_ticket_attachments(ticket_id);
create index if not exists support_ticket_activity_ticket_idx on public.support_ticket_activity(ticket_id);

drop trigger if exists set_support_tickets_updated_at on public.support_tickets;
create trigger set_support_tickets_updated_at
before update on public.support_tickets
for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'support-attachments',
  'support-attachments',
  false,
  52428800,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/pdf',
    'video/mp4'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;
alter table public.support_ticket_attachments enable row level security;
alter table public.support_ticket_activity enable row level security;

drop policy if exists "Support users can view relevant tickets" on public.support_tickets;
create policy "Support users can view relevant tickets"
on public.support_tickets for select
using (
  auth.uid() is not null
  and (
    created_by = auth.uid()
    or public.current_profile_role() in ('admin', 'support')
  )
);

drop policy if exists "Approved users can create support tickets" on public.support_tickets;
create policy "Approved users can create support tickets"
on public.support_tickets for insert
with check (
  auth.uid() is not null
  and created_by = auth.uid()
  and public.current_profile_role() in ('admin', 'manager', 'agent', 'viewer', 'support')
);

drop policy if exists "Support staff can update tickets" on public.support_tickets;
create policy "Support staff can update tickets"
on public.support_tickets for update
using (public.current_profile_role() in ('admin', 'support'))
with check (public.current_profile_role() in ('admin', 'support'));

drop policy if exists "Support messages follow ticket access" on public.support_ticket_messages;
create policy "Support messages follow ticket access"
on public.support_ticket_messages for select
using (
  exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id
      and (
        t.created_by = auth.uid()
        or public.current_profile_role() in ('admin', 'support')
      )
  )
  and (
    is_internal = false
    or public.current_profile_role() in ('admin', 'support')
  )
);

drop policy if exists "Approved users can add ticket replies" on public.support_ticket_messages;
create policy "Approved users can add ticket replies"
on public.support_ticket_messages for insert
with check (
  auth.uid() is not null
  and author_id = auth.uid()
  and exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id
      and (
        public.current_profile_role() in ('admin', 'support')
        or (
          t.created_by = auth.uid()
          and is_internal = false
        )
      )
  )
);

drop policy if exists "Support attachments follow ticket access" on public.support_ticket_attachments;
create policy "Support attachments follow ticket access"
on public.support_ticket_attachments for select
using (
  exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id
      and (
        t.created_by = auth.uid()
        or public.current_profile_role() in ('admin', 'support')
      )
  )
  and (
    is_internal = false
    or public.current_profile_role() in ('admin', 'support')
  )
);

drop policy if exists "Approved users can register support attachments" on public.support_ticket_attachments;
create policy "Approved users can register support attachments"
on public.support_ticket_attachments for insert
with check (
  auth.uid() is not null
  and created_by = auth.uid()
  and exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id
      and (
        public.current_profile_role() in ('admin', 'support')
        or (
          t.created_by = auth.uid()
          and is_internal = false
        )
      )
  )
);

drop policy if exists "Support activity follows ticket access" on public.support_ticket_activity;
create policy "Support activity follows ticket access"
on public.support_ticket_activity for select
using (
  exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id
      and (
        t.created_by = auth.uid()
        or public.current_profile_role() in ('admin', 'support')
      )
  )
  and (
    activity_type <> 'internal_note_added'
    or public.current_profile_role() in ('admin', 'support')
  )
);

drop policy if exists "Approved users can log support activity" on public.support_ticket_activity;
create policy "Approved users can log support activity"
on public.support_ticket_activity for insert
with check (
  auth.uid() is not null
  and (
    actor_id = auth.uid()
    or actor_id is null
  )
  and exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id
      and (
        public.current_profile_role() in ('admin', 'support')
        or t.created_by = auth.uid()
      )
  )
);

drop policy if exists "Authenticated users can upload support attachments" on storage.objects;
create policy "Authenticated users can upload support attachments"
on storage.objects for insert
with check (
  bucket_id = 'support-attachments'
  and auth.uid() is not null
);

drop policy if exists "Support attachments are privately readable" on storage.objects;
create policy "Support attachments are privately readable"
on storage.objects for select
using (
  bucket_id = 'support-attachments'
  and exists (
    select 1
    from public.support_ticket_attachments attachment
    join public.support_tickets ticket on ticket.id = attachment.ticket_id
    where attachment.bucket_id = bucket_id
      and attachment.storage_path = name
      and (
        ticket.created_by = auth.uid()
        or public.current_profile_role() in ('admin', 'support')
      )
      and (
        attachment.is_internal = false
        or public.current_profile_role() in ('admin', 'support')
      )
  )
);

select to_regclass('public.support_tickets') as support_tickets;
