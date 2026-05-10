alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists agency_name text;

create table if not exists public.user_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'available',
  status_message text,
  updated_at timestamptz not null default now(),
  constraint user_status_status_check check (
    status in (
      'available',
      'in_meeting',
      'property_visit',
      'driving',
      'do_not_disturb',
      'offline',
      'vacation'
    )
  ),
  constraint user_status_user_unique unique (user_id)
);

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_minutes_before_meeting integer not null default 60
    check (reminder_minutes_before_meeting between 0 and 10080),
  email_notifications boolean not null default true,
  push_notifications boolean not null default true,
  in_app_notifications boolean not null default true,
  whatsapp_notifications boolean not null default false,
  preferred_calendar_view text not null default 'week'
    check (preferred_calendar_view in ('day', 'week', 'month', 'agenda')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_user_unique unique (user_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'system_alert'
    check (
      type in (
        'meeting_reminder',
        'new_assigned_lead',
        'property_update',
        'follow_up_reminder',
        'contract_reminder',
        'system_alert'
      )
    ),
  related_entity_type text,
  related_entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meetings_completed integer not null default 0 check (meetings_completed >= 0),
  leads_active integer not null default 0 check (leads_active >= 0),
  followups_overdue integer not null default 0 check (followups_overdue >= 0),
  properties_active integer not null default 0 check (properties_active >= 0),
  deals_closed integer not null default 0 check (deals_closed >= 0),
  updated_at timestamptz not null default now(),
  constraint agent_metrics_user_unique unique (user_id)
);

create index if not exists user_status_user_idx on public.user_status(user_id);
create index if not exists user_preferences_user_idx on public.user_preferences(user_id);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications(user_id, read_at) where read_at is null;
create index if not exists activity_logs_user_created_idx on public.activity_logs(user_id, created_at desc);
create index if not exists agent_metrics_user_idx on public.agent_metrics(user_id);

drop trigger if exists set_user_preferences_updated_at on public.user_preferences;
create trigger set_user_preferences_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

create or replace function public.set_user_status_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_status_updated_at on public.user_status;
create trigger set_user_status_updated_at
before update on public.user_status
for each row execute function public.set_user_status_updated_at();

drop trigger if exists set_agent_metrics_updated_at on public.agent_metrics;
create trigger set_agent_metrics_updated_at
before update on public.agent_metrics
for each row execute function public.set_user_status_updated_at();

alter table public.user_status enable row level security;
alter table public.user_preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;
alter table public.agent_metrics enable row level security;

drop policy if exists "Users can read own status" on public.user_status;
create policy "Users can read own status"
on public.user_status for select
using (
  user_id = auth.uid()
  or public.current_profile_role() in ('admin', 'manager')
);

drop policy if exists "Users can upsert own status" on public.user_status;
create policy "Users can upsert own status"
on public.user_status for insert
with check (user_id = auth.uid());

drop policy if exists "Users can update own status" on public.user_status;
create policy "Users can update own status"
on public.user_status for update
using (
  user_id = auth.uid()
  or public.current_profile_role() in ('admin', 'manager')
)
with check (
  user_id = auth.uid()
  or public.current_profile_role() in ('admin', 'manager')
);

drop policy if exists "Users can read own preferences" on public.user_preferences;
create policy "Users can read own preferences"
on public.user_preferences for select
using (user_id = auth.uid());

drop policy if exists "Users can create own preferences" on public.user_preferences;
create policy "Users can create own preferences"
on public.user_preferences for insert
with check (user_id = auth.uid());

drop policy if exists "Users can update own preferences" on public.user_preferences;
create policy "Users can update own preferences"
on public.user_preferences for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

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

drop policy if exists "Managers can create notifications" on public.notifications;
create policy "Managers can create notifications"
on public.notifications for insert
with check (
  auth.uid() is not null
  and (
    user_id = auth.uid()
    or public.current_profile_role() in ('admin', 'manager')
  )
);

drop policy if exists "Users can read own activity logs" on public.activity_logs;
create policy "Users can read own activity logs"
on public.activity_logs for select
using (
  user_id = auth.uid()
  or public.current_profile_role() in ('admin', 'manager')
);

drop policy if exists "Users can create own activity logs" on public.activity_logs;
create policy "Users can create own activity logs"
on public.activity_logs for insert
with check (
  user_id = auth.uid()
  or public.current_profile_role() in ('admin', 'manager')
);

drop policy if exists "Users can read own metrics" on public.agent_metrics;
create policy "Users can read own metrics"
on public.agent_metrics for select
using (
  user_id = auth.uid()
  or public.current_profile_role() in ('admin', 'manager')
);

drop policy if exists "Users can create own metrics" on public.agent_metrics;
create policy "Users can create own metrics"
on public.agent_metrics for insert
with check (
  user_id = auth.uid()
  or public.current_profile_role() in ('admin', 'manager')
);

drop policy if exists "Users can update own metrics" on public.agent_metrics;
create policy "Users can update own metrics"
on public.agent_metrics for update
using (
  user_id = auth.uid()
  or public.current_profile_role() in ('admin', 'manager')
)
with check (
  user_id = auth.uid()
  or public.current_profile_role() in ('admin', 'manager')
);

select
  to_regclass('public.user_status') as user_status,
  to_regclass('public.user_preferences') as user_preferences,
  to_regclass('public.notifications') as notifications,
  to_regclass('public.activity_logs') as activity_logs,
  to_regclass('public.agent_metrics') as agent_metrics;
