-- PRONA X Smart Follow-Up Assistant.
-- Rules-based CRM intelligence for seller lead follow-up recommendations.

create table if not exists public.lead_activity_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.seller_leads(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  channel text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint lead_activity_events_event_type_check check (
    event_type in (
      'email_opened',
      'email_clicked',
      'email_replied',
      'property_viewed',
      'property_saved',
      'whatsapp_message_sent',
      'whatsapp_reply_received',
      'phone_call_answered',
      'phone_call_missed',
      'viewing_requested',
      'appointment_booked',
      'document_sent',
      'no_response',
      'manual_note_added',
      'followup_completed'
    )
  ),
  constraint lead_activity_events_channel_check check (
    channel is null
    or channel in ('email', 'whatsapp', 'phone', 'crm', 'manual', 'unknown')
  ),
  constraint lead_activity_events_metadata_object_check check (
    jsonb_typeof(metadata) = 'object'
  )
);

create index if not exists lead_activity_events_lead_id_idx
  on public.lead_activity_events(lead_id);

create index if not exists lead_activity_events_created_at_idx
  on public.lead_activity_events(created_at desc);

create index if not exists lead_activity_events_event_type_idx
  on public.lead_activity_events(event_type);

create index if not exists lead_activity_events_channel_idx
  on public.lead_activity_events(channel);

create index if not exists lead_activity_events_lead_created_idx
  on public.lead_activity_events(lead_id, created_at desc);

create table if not exists public.lead_ai_followup_scores (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.seller_leads(id) on delete cascade,
  engagement_score integer not null default 0,
  urgency_level text not null default 'Low',
  response_probability integer not null default 0,
  best_contact_day text,
  best_contact_hour integer,
  best_contact_window text,
  preferred_channel text,
  recommended_action text,
  reasoning jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint lead_ai_followup_scores_engagement_check check (
    engagement_score between 0 and 100
  ),
  constraint lead_ai_followup_scores_response_check check (
    response_probability between 0 and 100
  ),
  constraint lead_ai_followup_scores_urgency_check check (
    urgency_level in ('Low', 'Medium', 'High')
  ),
  constraint lead_ai_followup_scores_hour_check check (
    best_contact_hour is null or best_contact_hour between 0 and 23
  ),
  constraint lead_ai_followup_scores_channel_check check (
    preferred_channel is null
    or preferred_channel in ('email', 'whatsapp', 'phone', 'crm', 'manual', 'unknown')
  ),
  constraint lead_ai_followup_scores_reasoning_object_check check (
    jsonb_typeof(reasoning) = 'object'
  )
);

create index if not exists lead_ai_followup_scores_lead_id_idx
  on public.lead_ai_followup_scores(lead_id);

create index if not exists lead_ai_followup_scores_urgency_idx
  on public.lead_ai_followup_scores(urgency_level);

create index if not exists lead_ai_followup_scores_response_idx
  on public.lead_ai_followup_scores(response_probability desc);

create index if not exists lead_ai_followup_scores_updated_at_idx
  on public.lead_ai_followup_scores(updated_at desc);

drop trigger if exists set_lead_ai_followup_scores_updated_at
on public.lead_ai_followup_scores;

create trigger set_lead_ai_followup_scores_updated_at
before update on public.lead_ai_followup_scores
for each row execute function public.set_updated_at();

alter table public.lead_activity_events enable row level security;
alter table public.lead_ai_followup_scores enable row level security;

drop policy if exists "Operators can view lead activity events"
on public.lead_activity_events;

create policy "Operators can view lead activity events"
on public.lead_activity_events for select
using (
  exists (
    select 1
    from public.seller_leads lead
    where lead.id = lead_activity_events.lead_id
      and (
        public.current_profile_role()::text in ('admin', 'manager')
        or lead.created_by = auth.uid()
        or lead.assigned_agent_id = auth.uid()
      )
  )
);

drop policy if exists "Operators can create lead activity events"
on public.lead_activity_events;

create policy "Operators can create lead activity events"
on public.lead_activity_events for insert
with check (
  auth.uid() is not null
  and user_id = auth.uid()
  and public.current_profile_role()::text in ('admin', 'manager', 'agent')
  and exists (
    select 1
    from public.seller_leads lead
    where lead.id = lead_activity_events.lead_id
      and (
        public.current_profile_role()::text in ('admin', 'manager')
        or lead.created_by = auth.uid()
        or lead.assigned_agent_id = auth.uid()
      )
  )
);

drop policy if exists "Operators can view lead AI scores"
on public.lead_ai_followup_scores;

create policy "Operators can view lead AI scores"
on public.lead_ai_followup_scores for select
using (
  exists (
    select 1
    from public.seller_leads lead
    where lead.id = lead_ai_followup_scores.lead_id
      and (
        public.current_profile_role()::text in ('admin', 'manager')
        or lead.created_by = auth.uid()
        or lead.assigned_agent_id = auth.uid()
      )
  )
);

drop policy if exists "Operators can create lead AI scores"
on public.lead_ai_followup_scores;

create policy "Operators can create lead AI scores"
on public.lead_ai_followup_scores for insert
with check (
  auth.uid() is not null
  and public.current_profile_role()::text in ('admin', 'manager', 'agent')
  and exists (
    select 1
    from public.seller_leads lead
    where lead.id = lead_ai_followup_scores.lead_id
      and (
        public.current_profile_role()::text in ('admin', 'manager')
        or lead.created_by = auth.uid()
        or lead.assigned_agent_id = auth.uid()
      )
  )
);

drop policy if exists "Operators can update lead AI scores"
on public.lead_ai_followup_scores;

create policy "Operators can update lead AI scores"
on public.lead_ai_followup_scores for update
using (
  public.current_profile_role()::text in ('admin', 'manager', 'agent')
  and exists (
    select 1
    from public.seller_leads lead
    where lead.id = lead_ai_followup_scores.lead_id
      and (
        public.current_profile_role()::text in ('admin', 'manager')
        or lead.created_by = auth.uid()
        or lead.assigned_agent_id = auth.uid()
      )
  )
)
with check (
  public.current_profile_role()::text in ('admin', 'manager', 'agent')
  and exists (
    select 1
    from public.seller_leads lead
    where lead.id = lead_ai_followup_scores.lead_id
      and (
        public.current_profile_role()::text in ('admin', 'manager')
        or lead.created_by = auth.uid()
        or lead.assigned_agent_id = auth.uid()
      )
  )
);

grant select, insert on public.lead_activity_events to authenticated;
grant select, insert, update on public.lead_ai_followup_scores to authenticated;

notify pgrst, 'reload schema';
