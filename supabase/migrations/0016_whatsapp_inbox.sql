-- WhatsApp CRM Inbox for customer-facing conversations.
-- Keeps staff/internal messaging in conversations/messages untouched.

create extension if not exists "pgcrypto";

create table if not exists public.whatsapp_accounts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid,
  phone_number text,
  display_name text,
  waba_id text,
  phone_number_id text,
  status text not null default 'not_configured',
  connected_by uuid references public.profiles(id) on delete set null,
  connected_at timestamptz,
  disconnected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_accounts_status_check check (
    status in ('not_configured', 'connected', 'disabled', 'error')
  )
);

drop index if exists whatsapp_accounts_phone_number_id_unique;
create unique index if not exists whatsapp_accounts_phone_number_id_unique
  on public.whatsapp_accounts(phone_number_id);

create table if not exists public.whatsapp_contacts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid,
  phone_e164 text not null,
  display_name text,
  matched_profile_id uuid references public.profiles(id) on delete set null,
  matched_lead_id uuid,
  matched_seller_lead_id uuid references public.seller_leads(id) on delete set null,
  matched_property_id uuid references public.properties(id) on delete set null,
  opted_out boolean not null default false,
  marketing_consent boolean not null default false,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_contacts_phone_unique unique (phone_e164)
);

create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid,
  whatsapp_account_id uuid references public.whatsapp_accounts(id) on delete set null,
  contact_id uuid not null references public.whatsapp_contacts(id) on delete cascade,
  assigned_agent_id uuid references public.profiles(id) on delete set null,
  status text not null default 'open',
  type text not null default 'unknown',
  priority text not null default 'normal',
  unread_count integer not null default 0 check (unread_count >= 0),
  last_message_at timestamptz,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  customer_service_window_expires_at timestamptz,
  sla_due_at timestamptz,
  next_follow_up_at timestamptz,
  follow_up_note text,
  linked_buyer_lead_id uuid,
  linked_rental_lead_id uuid,
  linked_seller_lead_id uuid references public.seller_leads(id) on delete set null,
  linked_property_id uuid references public.properties(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_conversations_status_check check (
    status in ('open', 'closed', 'archived', 'spam')
  ),
  constraint whatsapp_conversations_type_check check (
    type in ('unknown', 'buyer', 'renter', 'seller', 'owner', 'property', 'support')
  ),
  constraint whatsapp_conversations_priority_check check (
    priority in ('normal', 'urgent', 'hot')
  )
);

create unique index if not exists whatsapp_conversations_account_contact_unique
  on public.whatsapp_conversations(whatsapp_account_id, contact_id)
  where status <> 'archived';

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  whatsapp_message_id text unique,
  direction text not null,
  sender_type text not null,
  sender_user_id uuid references public.profiles(id) on delete set null,
  body text,
  message_type text not null default 'text',
  media_url text,
  media_mime_type text,
  template_name text,
  template_variables jsonb,
  status text not null default 'received',
  status_reason text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_messages_direction_check check (
    direction in ('inbound', 'outbound')
  ),
  constraint whatsapp_messages_sender_type_check check (
    sender_type in ('customer', 'agent', 'system')
  ),
  constraint whatsapp_messages_message_type_check check (
    message_type in ('text', 'image', 'video', 'audio', 'document', 'location', 'interactive', 'template', 'unknown')
  ),
  constraint whatsapp_messages_status_check check (
    status in ('received', 'queued', 'sent', 'delivered', 'read', 'failed')
  )
);

create table if not exists public.whatsapp_internal_notes (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_conversation_links (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint whatsapp_conversation_links_entity_check check (
    entity_type in ('buyer_lead', 'rental_lead', 'seller_lead', 'property', 'appointment', 'task')
  ),
  constraint whatsapp_conversation_links_unique unique (conversation_id, entity_type, entity_id)
);

create table if not exists public.whatsapp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid,
  provider_event_id text unique,
  event_type text not null,
  payload_hash text,
  processed_at timestamptz,
  status text not null default 'received',
  error_message text,
  created_at timestamptz not null default now(),
  constraint whatsapp_webhook_events_status_check check (
    status in ('received', 'processed', 'failed', 'ignored')
  )
);

create table if not exists public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid,
  name text not null,
  category text not null default 'utility',
  language text not null default 'sq',
  status text not null default 'pending',
  body text not null,
  variables jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_templates_category_check check (
    category in ('utility', 'marketing', 'authentication', 'service', 'other')
  ),
  constraint whatsapp_templates_status_check check (
    status in ('approved', 'pending', 'rejected', 'disabled')
  )
);

create index if not exists whatsapp_contacts_phone_idx on public.whatsapp_contacts(phone_e164);
create index if not exists whatsapp_contacts_seller_lead_idx on public.whatsapp_contacts(matched_seller_lead_id);
create index if not exists whatsapp_conversations_assigned_idx on public.whatsapp_conversations(assigned_agent_id);
create index if not exists whatsapp_conversations_last_message_idx on public.whatsapp_conversations(last_message_at desc nulls last);
create index if not exists whatsapp_conversations_unread_idx on public.whatsapp_conversations(unread_count) where unread_count > 0;
create index if not exists whatsapp_conversations_status_idx on public.whatsapp_conversations(status);
create index if not exists whatsapp_messages_conversation_created_idx on public.whatsapp_messages(conversation_id, created_at);
create index if not exists whatsapp_messages_external_idx on public.whatsapp_messages(whatsapp_message_id);
create index if not exists whatsapp_notes_conversation_idx on public.whatsapp_internal_notes(conversation_id, created_at);
create index if not exists whatsapp_links_conversation_idx on public.whatsapp_conversation_links(conversation_id);
create index if not exists whatsapp_webhook_events_status_idx on public.whatsapp_webhook_events(status, created_at);

drop trigger if exists set_whatsapp_accounts_updated_at on public.whatsapp_accounts;
create trigger set_whatsapp_accounts_updated_at
before update on public.whatsapp_accounts
for each row execute function public.set_updated_at();

drop trigger if exists set_whatsapp_contacts_updated_at on public.whatsapp_contacts;
create trigger set_whatsapp_contacts_updated_at
before update on public.whatsapp_contacts
for each row execute function public.set_updated_at();

drop trigger if exists set_whatsapp_conversations_updated_at on public.whatsapp_conversations;
create trigger set_whatsapp_conversations_updated_at
before update on public.whatsapp_conversations
for each row execute function public.set_updated_at();

drop trigger if exists set_whatsapp_messages_updated_at on public.whatsapp_messages;
create trigger set_whatsapp_messages_updated_at
before update on public.whatsapp_messages
for each row execute function public.set_updated_at();

drop trigger if exists set_whatsapp_notes_updated_at on public.whatsapp_internal_notes;
create trigger set_whatsapp_notes_updated_at
before update on public.whatsapp_internal_notes
for each row execute function public.set_updated_at();

drop trigger if exists set_whatsapp_templates_updated_at on public.whatsapp_templates;
create trigger set_whatsapp_templates_updated_at
before update on public.whatsapp_templates
for each row execute function public.set_updated_at();

alter table public.whatsapp_accounts enable row level security;
alter table public.whatsapp_contacts enable row level security;
alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.whatsapp_internal_notes enable row level security;
alter table public.whatsapp_conversation_links enable row level security;
alter table public.whatsapp_webhook_events enable row level security;
alter table public.whatsapp_templates enable row level security;

drop policy if exists "CRM users can view whatsapp accounts" on public.whatsapp_accounts;
create policy "CRM users can view whatsapp accounts"
on public.whatsapp_accounts for select
using (public.current_profile_role() in ('admin', 'manager', 'agent', 'support'));

drop policy if exists "Admins can manage whatsapp accounts" on public.whatsapp_accounts;
create policy "Admins can manage whatsapp accounts"
on public.whatsapp_accounts for all
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

drop policy if exists "CRM users can view permitted whatsapp contacts" on public.whatsapp_contacts;
create policy "CRM users can view permitted whatsapp contacts"
on public.whatsapp_contacts for select
using (
  public.current_profile_role() in ('admin', 'manager', 'support')
  or exists (
    select 1
    from public.whatsapp_conversations conversation
    where conversation.contact_id = whatsapp_contacts.id
      and conversation.assigned_agent_id = auth.uid()
  )
);

drop policy if exists "Authorized users can create whatsapp contacts" on public.whatsapp_contacts;
create policy "Authorized users can create whatsapp contacts"
on public.whatsapp_contacts for insert
with check (public.current_profile_role() in ('admin', 'manager', 'agent', 'support'));

drop policy if exists "Authorized users can update permitted whatsapp contacts" on public.whatsapp_contacts;
create policy "Authorized users can update permitted whatsapp contacts"
on public.whatsapp_contacts for update
using (
  public.current_profile_role() in ('admin', 'manager', 'support')
  or exists (
    select 1
    from public.whatsapp_conversations conversation
    where conversation.contact_id = whatsapp_contacts.id
      and conversation.assigned_agent_id = auth.uid()
  )
)
with check (
  public.current_profile_role() in ('admin', 'manager', 'support')
  or exists (
    select 1
    from public.whatsapp_conversations conversation
    where conversation.contact_id = whatsapp_contacts.id
      and conversation.assigned_agent_id = auth.uid()
  )
);

drop policy if exists "Users can view permitted whatsapp conversations" on public.whatsapp_conversations;
create policy "Users can view permitted whatsapp conversations"
on public.whatsapp_conversations for select
using (
  public.current_profile_role() in ('admin', 'manager', 'support')
  or assigned_agent_id = auth.uid()
);

drop policy if exists "Authorized users can create whatsapp conversations" on public.whatsapp_conversations;
create policy "Authorized users can create whatsapp conversations"
on public.whatsapp_conversations for insert
with check (
  public.current_profile_role() in ('admin', 'manager', 'agent', 'support')
  and (
    assigned_agent_id is null
    or assigned_agent_id = auth.uid()
    or public.current_profile_role() in ('admin', 'manager', 'support')
  )
);

drop policy if exists "Users can update permitted whatsapp conversations" on public.whatsapp_conversations;
create policy "Users can update permitted whatsapp conversations"
on public.whatsapp_conversations for update
using (
  public.current_profile_role() in ('admin', 'manager', 'support')
  or assigned_agent_id = auth.uid()
)
with check (
  public.current_profile_role() in ('admin', 'manager', 'support')
  or assigned_agent_id = auth.uid()
);

drop policy if exists "Users can view permitted whatsapp messages" on public.whatsapp_messages;
create policy "Users can view permitted whatsapp messages"
on public.whatsapp_messages for select
using (
  exists (
    select 1
    from public.whatsapp_conversations conversation
    where conversation.id = whatsapp_messages.conversation_id
      and (
        public.current_profile_role() in ('admin', 'manager', 'support')
        or conversation.assigned_agent_id = auth.uid()
      )
  )
);

drop policy if exists "Authorized users can create outbound whatsapp messages" on public.whatsapp_messages;
create policy "Authorized users can create outbound whatsapp messages"
on public.whatsapp_messages for insert
with check (
  direction = 'outbound'
  and sender_user_id = auth.uid()
  and public.current_profile_role() in ('admin', 'manager', 'agent', 'support')
  and exists (
    select 1
    from public.whatsapp_conversations conversation
    where conversation.id = whatsapp_messages.conversation_id
      and (
        public.current_profile_role() in ('admin', 'manager', 'support')
        or conversation.assigned_agent_id = auth.uid()
      )
  )
);

drop policy if exists "Authorized users can update permitted whatsapp messages" on public.whatsapp_messages;
create policy "Authorized users can update permitted whatsapp messages"
on public.whatsapp_messages for update
using (
  public.current_profile_role() in ('admin', 'manager', 'support')
  or sender_user_id = auth.uid()
)
with check (
  public.current_profile_role() in ('admin', 'manager', 'support')
  or sender_user_id = auth.uid()
);

drop policy if exists "Users can view permitted whatsapp notes" on public.whatsapp_internal_notes;
create policy "Users can view permitted whatsapp notes"
on public.whatsapp_internal_notes for select
using (
  exists (
    select 1
    from public.whatsapp_conversations conversation
    where conversation.id = whatsapp_internal_notes.conversation_id
      and (
        public.current_profile_role() in ('admin', 'manager', 'support')
        or conversation.assigned_agent_id = auth.uid()
      )
  )
);

drop policy if exists "Users can create permitted whatsapp notes" on public.whatsapp_internal_notes;
create policy "Users can create permitted whatsapp notes"
on public.whatsapp_internal_notes for insert
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.whatsapp_conversations conversation
    where conversation.id = whatsapp_internal_notes.conversation_id
      and (
        public.current_profile_role() in ('admin', 'manager', 'support')
        or conversation.assigned_agent_id = auth.uid()
      )
  )
);

drop policy if exists "Users can view permitted whatsapp links" on public.whatsapp_conversation_links;
create policy "Users can view permitted whatsapp links"
on public.whatsapp_conversation_links for select
using (
  exists (
    select 1
    from public.whatsapp_conversations conversation
    where conversation.id = whatsapp_conversation_links.conversation_id
      and (
        public.current_profile_role() in ('admin', 'manager', 'support')
        or conversation.assigned_agent_id = auth.uid()
      )
  )
);

drop policy if exists "Users can create permitted whatsapp links" on public.whatsapp_conversation_links;
create policy "Users can create permitted whatsapp links"
on public.whatsapp_conversation_links for insert
with check (
  public.current_profile_role() in ('admin', 'manager', 'agent', 'support')
  and (
    created_by = auth.uid()
    or public.current_profile_role() in ('admin', 'manager', 'support')
  )
  and exists (
    select 1
    from public.whatsapp_conversations conversation
    where conversation.id = whatsapp_conversation_links.conversation_id
      and (
        public.current_profile_role() in ('admin', 'manager', 'support')
        or conversation.assigned_agent_id = auth.uid()
      )
  )
);

drop policy if exists "Admins can read whatsapp webhook events" on public.whatsapp_webhook_events;
create policy "Admins can read whatsapp webhook events"
on public.whatsapp_webhook_events for select
using (public.current_profile_role() in ('admin', 'support'));

drop policy if exists "CRM users can view whatsapp templates" on public.whatsapp_templates;
create policy "CRM users can view whatsapp templates"
on public.whatsapp_templates for select
using (public.current_profile_role() in ('admin', 'manager', 'agent', 'support'));

drop policy if exists "Admins can manage whatsapp templates" on public.whatsapp_templates;
create policy "Admins can manage whatsapp templates"
on public.whatsapp_templates for all
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

grant select on public.whatsapp_accounts to authenticated;
grant select, insert, update on public.whatsapp_contacts to authenticated;
grant select, insert, update on public.whatsapp_conversations to authenticated;
grant select, insert, update on public.whatsapp_messages to authenticated;
grant select, insert on public.whatsapp_internal_notes to authenticated;
grant select, insert on public.whatsapp_conversation_links to authenticated;
grant select on public.whatsapp_webhook_events to authenticated;
grant select on public.whatsapp_templates to authenticated;

notify pgrst, 'reload schema';
