-- Focused Supabase security hardening after the sales/rentals workflow work.
-- This migration addresses the safe Security Advisor findings without changing
-- application data shape or public listing behavior.

-- Function search_path hardening.
-- Keep SECURITY DEFINER helpers and trigger helpers on a fixed search_path so
-- execution cannot be influenced by caller-controlled schemas.
alter function public.set_updated_at() set search_path = '';
alter function public.set_user_status_updated_at() set search_path = '';
alter function public.prevent_conversation_identity_change() set search_path = '';
alter function public.prevent_participant_privilege_escalation() set search_path = '';
alter function public.prevent_message_identity_change() set search_path = '';
alter function public.after_message_insert() set search_path = '';

alter function public.current_profile_role() set search_path = '';
alter function public.handle_new_user() set search_path = '';
alter function public.is_approved_messaging_role() set search_path = '';
alter function public.is_conversation_participant(uuid) set search_path = '';
alter function public.can_access_related_entity(text, uuid) set search_path = '';
alter function public.can_access_conversation(uuid) set search_path = '';
alter function public.can_manage_conversation(uuid) set search_path = '';
alter function public.can_send_message(uuid) set search_path = '';

-- Prevent future public-schema functions from being exposed as RPC by default.
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon;
alter default privileges in schema public revoke execute on functions from authenticated;

-- Direct API execution of internal messaging helpers is not required for anon.
-- Authenticated execution remains because current policies evaluate these
-- helpers inside RLS checks in this schema.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke execute on function public.is_approved_messaging_role() from public, anon;
grant execute on function public.is_approved_messaging_role() to authenticated;

revoke execute on function public.is_conversation_participant(uuid) from public, anon;
grant execute on function public.is_conversation_participant(uuid) to authenticated;

revoke execute on function public.can_access_related_entity(text, uuid) from public, anon;
grant execute on function public.can_access_related_entity(text, uuid) to authenticated;

revoke execute on function public.can_access_conversation(uuid) from public, anon;
grant execute on function public.can_access_conversation(uuid) to authenticated;

revoke execute on function public.can_manage_conversation(uuid) from public, anon;
grant execute on function public.can_manage_conversation(uuid) to authenticated;

revoke execute on function public.can_send_message(uuid) from public, anon;
grant execute on function public.can_send_message(uuid) to authenticated;

-- current_profile_role() intentionally keeps its existing direct execute grants
-- for this pass. Several public read policies still reference it, including
-- public property media visibility. Moving it fully private requires a broader
-- RLS policy refactor so anon public listing pages keep working.

-- Auth audit log hardening. Keep low-friction auth telemetry, but constrain
-- accepted event types and payload shape instead of allowing arbitrary inserts.
do $$
begin
  alter table public.auth_audit_events
    add constraint auth_audit_events_event_type_check
    check (
      event_type in (
        'login_failure',
        'login_success',
        'logout',
        'oauth_start_failed',
        'password_reset_completed',
        'password_reset_requested',
        'signup_failed',
        'signup_requested'
      )
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.auth_audit_events
    add constraint auth_audit_events_metadata_object_check
    check (jsonb_typeof(metadata) = 'object' and octet_length(metadata::text) <= 4096);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.auth_audit_events
    add constraint auth_audit_events_safe_text_check
    check (
      (ip_address is null or char_length(ip_address) <= 64)
      and (user_agent is null or char_length(user_agent) <= 512)
      and (email_hash is null or email_hash ~ '^[a-f0-9]{64}$')
    );
exception
  when duplicate_object then null;
end $$;

drop policy if exists "Auth audit events can be created" on public.auth_audit_events;
create policy "Auth audit events can be created"
on public.auth_audit_events
for insert
to anon, authenticated
with check (
  event_type in (
    'login_failure',
    'login_success',
    'logout',
    'oauth_start_failed',
    'password_reset_completed',
    'password_reset_requested',
    'signup_failed',
    'signup_requested'
  )
  and jsonb_typeof(metadata) = 'object'
  and octet_length(metadata::text) <= 4096
  and (ip_address is null or char_length(ip_address) <= 64)
  and (user_agent is null or char_length(user_agent) <= 512)
  and (email_hash is null or email_hash ~ '^[a-f0-9]{64}$')
  and (
    case
      when auth.uid() is null then
        user_id is null
        and actor_user_id is null
      else
        (user_id is null or user_id = auth.uid())
        and (actor_user_id is null or actor_user_id = auth.uid())
    end
  )
  and (
    case
      when target_user_id is null then true
      when event_type = 'signup_requested' then true
      when auth.uid() is not null then
        target_user_id = auth.uid()
        or public.current_profile_role() = 'admin'
      else false
    end
  )
);

-- Public buckets can serve known public URLs without granting broad SELECT on
-- storage.objects. Removing this policy prevents anonymous object enumeration.
drop policy if exists "Public property media is readable" on storage.objects;
