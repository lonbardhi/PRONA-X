alter table public.notifications
  add column if not exists workspace_id uuid not null default '00000000-0000-0000-0000-000000000001'::uuid,
  add column if not exists category text not null default 'system',
  add column if not exists priority text not null default 'normal',
  add column if not exists status text not null default 'unread',
  add column if not exists actor_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists action_url text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists dedupe_key text,
  add column if not exists idempotency_key text,
  add column if not exists scheduled_for timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists dismissed_at timestamptz,
  add column if not exists snoozed_until timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.notifications
  drop constraint if exists notifications_type_check,
  drop constraint if exists notifications_category_check,
  drop constraint if exists notifications_priority_check,
  drop constraint if exists notifications_status_check,
  drop constraint if exists notifications_related_entity_type_check,
  drop constraint if exists notifications_action_url_check;

alter table public.notifications
  add constraint notifications_type_check check (
    type in (
      'meeting_reminder',
      'visit_scheduled',
      'visit_starts_soon',
      'visit_overdue',
      'visit_cancelled',
      'visit_rescheduled',
      'new_assigned_lead',
      'lead_assigned',
      'lead_follow_up_due',
      'lead_follow_up_overdue',
      'duplicate_lead_detected',
      'property_update',
      'property_assigned',
      'property_published',
      'property_missing_media',
      'property_missing_coordinates',
      'property_price_changed',
      'property_status_changed',
      'rental_contract_ending',
      'follow_up_reminder',
      'contract_reminder',
      'contract_pending_signature',
      'contract_expiring_soon',
      'document_uploaded',
      'document_rejected',
      'document_requires_review',
      'task_assigned',
      'task_due_soon',
      'task_overdue',
      'request_assigned',
      'request_matched',
      'system_alert',
      'workspace_alert',
      'data_quality_warning',
      'map_location_warning',
      'message',
      'mention',
      'property_message',
      'lead_message',
      'meeting_message',
      'deal_room_message',
      'task_created_from_message'
    )
  ),
  add constraint notifications_category_check check (
    category in (
      'calendar',
      'sales',
      'rentals',
      'leads',
      'messages',
      'documents',
      'contracts',
      'tasks',
      'requests',
      'system',
      'workspace',
      'data_quality',
      'map_location'
    )
  ),
  add constraint notifications_priority_check check (priority in ('low', 'normal', 'high', 'urgent')),
  add constraint notifications_status_check check (status in ('unread', 'read', 'archived', 'dismissed', 'snoozed')),
  add constraint notifications_related_entity_type_check check (
    related_entity_type is null
    or related_entity_type in (
      'property',
      'sale_property',
      'rental_property',
      'lead',
      'message_thread',
      'appointment',
      'calendar_event',
      'meeting',
      'client',
      'deal',
      'task',
      'request',
      'document',
      'contract',
      'user',
      'workspace',
      'import_job',
      'system'
    )
  ),
  add constraint notifications_action_url_check check (
    action_url is null
    or (
      action_url like '/%'
      and action_url not like '//%'
      and action_url !~* '^[a-z][a-z0-9+.-]*:'
    )
  );

update public.notifications
set
  category = case
    when type in ('message', 'mention', 'property_message', 'lead_message', 'meeting_message', 'deal_room_message', 'task_created_from_message') then 'messages'
    when type = 'meeting_reminder' then 'calendar'
    when type = 'new_assigned_lead' then 'leads'
    when type = 'contract_reminder' then 'contracts'
    when type = 'property_update' then 'sales'
    when type = 'follow_up_reminder' then 'tasks'
    else category
  end,
  priority = case
    when type in ('mention', 'new_assigned_lead', 'contract_reminder') then 'high'
    else priority
  end,
  status = case
    when read_at is not null and status = 'unread' then 'read'
    else status
  end,
  action_url = case
    when action_url is not null then action_url
    when conversation_id is not null then '/messages?conversation=' || conversation_id::text
    when related_entity_type in ('property', 'sale_property', 'rental_property') and related_entity_id is not null then '/properties/' || related_entity_id::text
    when related_entity_type = 'appointment' and related_entity_id is not null then '/appointments'
    else action_url
  end,
  delivered_at = coalesce(delivered_at, created_at),
  updated_at = now();

create index if not exists notifications_workspace_created_idx
  on public.notifications(workspace_id, created_at desc);

create index if not exists notifications_user_status_created_idx
  on public.notifications(user_id, status, created_at desc);

create index if not exists notifications_active_unread_idx
  on public.notifications(user_id, workspace_id, created_at desc)
  where status = 'unread'
    and read_at is null
    and archived_at is null
    and dismissed_at is null;

create index if not exists notifications_category_created_idx
  on public.notifications(user_id, category, created_at desc);

create unique index if not exists notifications_user_dedupe_key_idx
  on public.notifications(user_id, dedupe_key)
  where dedupe_key is not null;

create unique index if not exists notifications_workspace_idempotency_key_idx
  on public.notifications(workspace_id, idempotency_key)
  where idempotency_key is not null;

drop trigger if exists set_notifications_updated_at on public.notifications;
create trigger set_notifications_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
on public.notifications for select
using (
  user_id = auth.uid()
  or public.current_profile_role() in ('admin', 'manager')
);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
on public.notifications for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

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
    or (
      related_entity_type = 'appointment'
      and related_entity_id is not null
      and actor_user_id = auth.uid()
      and exists (
        select 1
        from public.appointments appointment
        where appointment.id = notifications.related_entity_id
          and notifications.user_id in (appointment.assigned_agent_id, appointment.created_by)
          and (
            auth.uid() in (appointment.assigned_agent_id, appointment.created_by)
            or public.current_profile_role() in ('admin', 'manager')
          )
      )
    )
  )
);
