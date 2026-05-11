create extension if not exists "pgcrypto";

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text,
  description text,
  related_entity_type text,
  related_entity_id uuid,
  created_by uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  is_archived boolean not null default false,
  archived_at timestamptz,
  archived_by uuid references public.profiles(id) on delete set null,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_type_check check (
    type in (
      'direct',
      'group',
      'property_thread',
      'lead_thread',
      'meeting_thread',
      'deal_room',
      'team_channel',
      'media_request',
      'system'
    )
  ),
  constraint conversations_related_entity_type_check check (
    related_entity_type is null
    or related_entity_type in (
      'property',
      'lead',
      'meeting',
      'client',
      'deal',
      'task',
      'contract'
    )
  ),
  constraint conversations_archive_check check (
    (is_archived = false and archived_at is null and archived_by is null)
    or (is_archived = true)
  )
);

create table if not exists public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  muted_at timestamptz,
  last_read_message_id uuid,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint conversation_participants_role_check check (
    role in ('owner', 'admin', 'member', 'readonly')
  ),
  constraint conversation_participants_unique unique (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  content text,
  message_type text not null default 'text',
  metadata jsonb not null default '{}'::jsonb,
  parent_message_id uuid references public.messages(id) on delete set null,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint messages_type_check check (
    message_type in (
      'text',
      'system',
      'attachment',
      'task_reference',
      'status_update',
      'note'
    )
  ),
  constraint messages_content_or_reference_check check (
    deleted_at is not null
    or nullif(btrim(coalesce(content, '')), '') is not null
    or metadata <> '{}'::jsonb
    or message_type in ('attachment', 'task_reference', 'status_update')
  ),
  constraint messages_content_length_check check (
    content is null or char_length(content) <= 5000
  )
);

alter table public.conversation_participants
  drop constraint if exists conversation_participants_last_read_message_id_fkey;

alter table public.conversation_participants
  add constraint conversation_participants_last_read_message_id_fkey
  foreign key (last_read_message_id) references public.messages(id) on delete set null;

create table if not exists public.message_mentions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  mentioned_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint message_mentions_unique unique (message_id, mentioned_user_id)
);

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  bucket_id text not null default 'message-attachments',
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint check (file_size is null or file_size >= 0),
  created_at timestamptz not null default now(),
  unique (bucket_id, storage_path)
);

create unique index if not exists conversations_active_entity_unique_idx
  on public.conversations(type, related_entity_type, related_entity_id)
  where related_entity_type is not null
    and related_entity_id is not null
    and is_archived = false;

create index if not exists conversations_type_idx on public.conversations(type);
create index if not exists conversations_related_entity_idx on public.conversations(related_entity_type, related_entity_id);
create index if not exists conversations_last_message_idx on public.conversations(last_message_at desc nulls last);
create index if not exists conversations_created_by_idx on public.conversations(created_by);
create index if not exists conversation_participants_user_idx on public.conversation_participants(user_id);
create index if not exists conversation_participants_conversation_idx on public.conversation_participants(conversation_id);
create index if not exists conversation_participants_active_user_idx
  on public.conversation_participants(user_id, conversation_id)
  where left_at is null;
create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at desc);
create index if not exists messages_sender_idx on public.messages(sender_id);
create index if not exists messages_search_idx
  on public.messages using gin (to_tsvector('simple', coalesce(content, '')));
create index if not exists message_mentions_mentioned_user_idx on public.message_mentions(mentioned_user_id);
create index if not exists message_mentions_message_idx on public.message_mentions(message_id);
create index if not exists message_attachments_message_idx on public.message_attachments(message_id);

drop trigger if exists set_conversations_updated_at on public.conversations;
create trigger set_conversations_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

drop trigger if exists set_messages_updated_at on public.messages;
create trigger set_messages_updated_at
before update on public.messages
for each row execute function public.set_updated_at();

create or replace function public.is_approved_messaging_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_profile_role()::text in ('admin', 'manager', 'agent', 'support', 'viewer'),
    false
  );
$$;

create or replace function public.is_conversation_participant(_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants participant
    where participant.conversation_id = _conversation_id
      and participant.user_id = auth.uid()
      and participant.left_at is null
  );
$$;

create or replace function public.can_access_related_entity(
  _entity_type text,
  _entity_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when _entity_type = 'property' then exists (
      select 1
      from public.properties property
      where property.id = _entity_id
        and (
          public.current_profile_role() in ('admin', 'manager')
          or property.created_by = auth.uid()
          or property.assigned_agent_id = auth.uid()
        )
    )
    when _entity_type = 'meeting' then exists (
      select 1
      from public.appointments appointment
      where appointment.id = _entity_id
        and (
          public.current_profile_role() in ('admin', 'manager')
          or appointment.created_by = auth.uid()
          or appointment.assigned_agent_id = auth.uid()
        )
    )
    else false
  end;
$$;

create or replace function public.can_access_conversation(_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations conversation
    where conversation.id = _conversation_id
      and auth.uid() is not null
      and (
        public.is_conversation_participant(conversation.id)
        or public.current_profile_role() in ('admin', 'manager')
        or public.can_access_related_entity(
          conversation.related_entity_type,
          conversation.related_entity_id
        )
      )
  );
$$;

create or replace function public.can_manage_conversation(_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations conversation
    where conversation.id = _conversation_id
      and auth.uid() is not null
      and (
        conversation.created_by = auth.uid()
        or public.current_profile_role() in ('admin', 'manager')
      )
  );
$$;

create or replace function public.can_send_message(_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations conversation
    where conversation.id = _conversation_id
      and conversation.is_archived = false
      and auth.uid() is not null
      and (
        exists (
          select 1
          from public.conversation_participants participant
          where participant.conversation_id = conversation.id
            and participant.user_id = auth.uid()
            and participant.left_at is null
            and participant.role in ('owner', 'admin', 'member')
        )
        or (
          public.current_profile_role() in ('admin', 'manager')
          and public.can_access_conversation(conversation.id)
        )
      )
  );
$$;

create or replace function public.prevent_conversation_identity_change()
returns trigger
language plpgsql
as $$
begin
  if public.current_profile_role() not in ('admin', 'manager') then
    if new.type <> old.type
      or new.related_entity_type is distinct from old.related_entity_type
      or new.related_entity_id is distinct from old.related_entity_id
      or new.created_by <> old.created_by then
      raise exception 'Conversation identity fields cannot be changed.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_conversation_identity_change on public.conversations;
create trigger prevent_conversation_identity_change
before update on public.conversations
for each row execute function public.prevent_conversation_identity_change();

create or replace function public.prevent_participant_privilege_escalation()
returns trigger
language plpgsql
as $$
begin
  if public.current_profile_role() not in ('admin', 'manager') then
    if new.conversation_id <> old.conversation_id
      or new.user_id <> old.user_id
      or new.role <> old.role then
      raise exception 'Only managers can change conversation participant membership or roles.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_participant_privilege_escalation on public.conversation_participants;
create trigger prevent_participant_privilege_escalation
before update on public.conversation_participants
for each row execute function public.prevent_participant_privilege_escalation();

create or replace function public.prevent_message_identity_change()
returns trigger
language plpgsql
as $$
begin
  if new.conversation_id <> old.conversation_id
    or new.sender_id <> old.sender_id
    or new.created_at <> old.created_at then
    raise exception 'Message identity fields cannot be changed.';
  end if;

  if new.deleted_at is not null and old.deleted_at is null then
    new.content = null;
  end if;

  if new.content is distinct from old.content and new.deleted_at is null then
    new.edited_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_message_identity_change on public.messages;
create trigger prevent_message_identity_change
before update on public.messages
for each row execute function public.prevent_message_identity_change();

create or replace function public.after_message_insert()
returns trigger
language plpgsql
as $$
begin
  update public.conversations
  set last_message_at = new.created_at,
      updated_at = now()
  where id = new.conversation_id;

  update public.conversation_participants
  set last_read_message_id = new.id,
      last_read_at = new.created_at
  where conversation_id = new.conversation_id
    and user_id = new.sender_id
    and left_at is null;

  return new;
end;
$$;

drop trigger if exists after_message_insert on public.messages;
create trigger after_message_insert
after insert on public.messages
for each row execute function public.after_message_insert();

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.message_mentions enable row level security;
alter table public.message_attachments enable row level security;

drop policy if exists "Approved staff can view messaging profiles" on public.profiles;
create policy "Approved staff can view messaging profiles"
on public.profiles for select
using (
  id = auth.uid()
  or (
    public.current_profile_role() in ('admin', 'manager', 'agent', 'support')
    and role in ('admin', 'manager', 'agent', 'support', 'viewer')
  )
);

drop policy if exists "Users can view accessible conversations" on public.conversations;
create policy "Users can view accessible conversations"
on public.conversations for select
using (public.can_access_conversation(id));

drop policy if exists "Approved users can create conversations" on public.conversations;
create policy "Approved users can create conversations"
on public.conversations for insert
with check (
  auth.uid() is not null
  and created_by = auth.uid()
  and public.current_profile_role() in ('admin', 'manager', 'agent', 'support')
);

drop policy if exists "Managers and creators can update conversations" on public.conversations;
create policy "Managers and creators can update conversations"
on public.conversations for update
using (public.can_manage_conversation(id))
with check (public.can_manage_conversation(id));

drop policy if exists "Users can view accessible participants" on public.conversation_participants;
create policy "Users can view accessible participants"
on public.conversation_participants for select
using (
  user_id = auth.uid()
  or public.can_access_conversation(conversation_id)
);

drop policy if exists "Creators can add conversation participants" on public.conversation_participants;
create policy "Creators can add conversation participants"
on public.conversation_participants for insert
with check (
  auth.uid() is not null
  and (
    public.can_manage_conversation(conversation_id)
    or (
      user_id = auth.uid()
      and public.can_access_conversation(conversation_id)
    )
  )
);

drop policy if exists "Users can update own participant state" on public.conversation_participants;
create policy "Users can update own participant state"
on public.conversation_participants for update
using (
  user_id = auth.uid()
  or public.can_manage_conversation(conversation_id)
)
with check (
  user_id = auth.uid()
  or public.can_manage_conversation(conversation_id)
);

drop policy if exists "Users can view accessible messages" on public.messages;
create policy "Users can view accessible messages"
on public.messages for select
using (public.can_access_conversation(conversation_id));

drop policy if exists "Active participants can send messages" on public.messages;
create policy "Active participants can send messages"
on public.messages for insert
with check (
  sender_id = auth.uid()
  and public.can_send_message(conversation_id)
);

drop policy if exists "Senders and managers can update messages" on public.messages;
create policy "Senders and managers can update messages"
on public.messages for update
using (
  sender_id = auth.uid()
  or public.current_profile_role() in ('admin', 'manager')
)
with check (
  sender_id = auth.uid()
  or public.current_profile_role() in ('admin', 'manager')
);

drop policy if exists "Users can view accessible mentions" on public.message_mentions;
create policy "Users can view accessible mentions"
on public.message_mentions for select
using (
  exists (
    select 1
    from public.messages message
    where message.id = message_id
      and public.can_access_conversation(message.conversation_id)
  )
);

drop policy if exists "Message senders can create mentions" on public.message_mentions;
create policy "Message senders can create mentions"
on public.message_mentions for insert
with check (
  exists (
    select 1
    from public.messages message
    where message.id = message_id
      and message.sender_id = auth.uid()
      and public.can_access_conversation(message.conversation_id)
  )
  and exists (
    select 1
    from public.conversation_participants participant
    join public.messages message on message.conversation_id = participant.conversation_id
    where message.id = message_id
      and participant.user_id = mentioned_user_id
      and participant.left_at is null
  )
);

drop policy if exists "Users can view accessible message attachments" on public.message_attachments;
create policy "Users can view accessible message attachments"
on public.message_attachments for select
using (
  exists (
    select 1
    from public.messages message
    where message.id = message_id
      and public.can_access_conversation(message.conversation_id)
  )
);

drop policy if exists "Message senders can register attachments" on public.message_attachments;
create policy "Message senders can register attachments"
on public.message_attachments for insert
with check (
  uploaded_by = auth.uid()
  and exists (
    select 1
    from public.messages message
    where message.id = message_id
      and message.sender_id = auth.uid()
      and public.can_access_conversation(message.conversation_id)
  )
);

alter table public.notifications
  add column if not exists conversation_id uuid,
  add column if not exists message_id uuid;

do $$
begin
  alter table public.notifications
    add constraint notifications_conversation_id_fkey
    foreign key (conversation_id) references public.conversations(id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.notifications
    add constraint notifications_message_id_fkey
    foreign key (message_id) references public.messages(id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (
    type in (
      'meeting_reminder',
      'new_assigned_lead',
      'property_update',
      'follow_up_reminder',
      'contract_reminder',
      'system_alert',
      'message',
      'mention',
      'property_message',
      'lead_message',
      'meeting_message',
      'deal_room_message',
      'task_created_from_message'
    )
  );

create index if not exists notifications_conversation_idx on public.notifications(conversation_id);
create index if not exists notifications_message_idx on public.notifications(message_id);

drop policy if exists "Managers can create notifications" on public.notifications;
drop policy if exists "Approved users can create allowed notifications" on public.notifications;
create policy "Approved users can create allowed notifications"
on public.notifications for insert
with check (
  auth.uid() is not null
  and (
    user_id = auth.uid()
    or public.current_profile_role() in ('admin', 'manager')
    or (
      type in ('message', 'mention', 'property_message', 'lead_message', 'meeting_message', 'deal_room_message')
      and conversation_id is not null
      and public.can_access_conversation(conversation_id)
      and exists (
        select 1
        from public.conversation_participants participant
        where participant.conversation_id = notifications.conversation_id
          and participant.user_id = notifications.user_id
          and participant.left_at is null
      )
    )
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-attachments',
  'message-attachments',
  false,
  52428800,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/avif',
    'application/pdf',
    'video/mp4',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users can upload message attachments" on storage.objects;
create policy "Authenticated users can upload message attachments"
on storage.objects for insert
with check (
  bucket_id = 'message-attachments'
  and auth.uid() is not null
);

drop policy if exists "Message attachments are privately readable" on storage.objects;
create policy "Message attachments are privately readable"
on storage.objects for select
using (
  bucket_id = 'message-attachments'
  and exists (
    select 1
    from public.message_attachments attachment
    join public.messages message on message.id = attachment.message_id
    where attachment.bucket_id = bucket_id
      and attachment.storage_path = name
      and public.can_access_conversation(message.conversation_id)
  )
);

drop policy if exists "Message attachment uploaders can delete own files" on storage.objects;
create policy "Message attachment uploaders can delete own files"
on storage.objects for delete
using (
  bucket_id = 'message-attachments'
  and (
    public.current_profile_role() in ('admin', 'manager')
    or exists (
      select 1
      from public.message_attachments attachment
      where attachment.bucket_id = bucket_id
        and attachment.storage_path = name
        and attachment.uploaded_by = auth.uid()
    )
  )
);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.conversations;
  end if;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.conversation_participants;
  end if;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

select
  to_regclass('public.conversations') as conversations,
  to_regclass('public.conversation_participants') as conversation_participants,
  to_regclass('public.messages') as messages,
  to_regclass('public.message_mentions') as message_mentions,
  to_regclass('public.message_attachments') as message_attachments;
