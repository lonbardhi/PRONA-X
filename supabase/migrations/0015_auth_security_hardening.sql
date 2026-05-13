-- Strengthen PRONA X auth state, account approval, and audit logging.
-- Run after 0014_seller_leads.sql.

alter table public.profiles
  add column if not exists account_status text not null default 'pending_approval',
  add column if not exists last_login_at timestamptz;

do $$
begin
  alter table public.profiles
    add constraint profiles_account_status_check
    check (
      account_status in (
        'pending_approval',
        'active',
        'disabled',
        'rejected',
        'deleted'
      )
    );
exception
  when duplicate_object then null;
end $$;

update public.profiles
set account_status = 'active'
where role::text in ('admin', 'manager', 'agent', 'viewer', 'support')
  and account_status = 'pending_approval';

update public.profiles
set account_status = 'pending_approval'
where role::text = 'pending';

create or replace function public.current_profile_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and account_status = 'active'
    and role::text in ('admin', 'manager', 'agent', 'viewer', 'support')
  limit 1;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.profiles as profile (
      id,
      full_name,
      email,
      role,
      account_status
    )
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
      new.email,
      'pending',
      'pending_approval'
    )
    on conflict (id) do update
      set email = coalesce(profile.email, excluded.email),
          full_name = coalesce(profile.full_name, excluded.full_name);
  exception
    when others then
      raise log 'handle_new_user failed for user %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

create or replace function public.prevent_profile_self_escalation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() = old.id then
    new.role := old.role;
    new.account_status := old.account_status;
    new.email := old.email;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_profile_self_escalation on public.profiles;
create trigger prevent_profile_self_escalation
before update on public.profiles
for each row execute function public.prevent_profile_self_escalation();

create table if not exists public.auth_audit_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_id uuid references auth.users(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  email_hash text,
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.auth_audit_events enable row level security;

grant select, insert on public.auth_audit_events to authenticated;
grant insert on public.auth_audit_events to anon;

drop policy if exists "Auth audit events can be created" on public.auth_audit_events;
create policy "Auth audit events can be created"
on public.auth_audit_events for insert
with check (true);

drop policy if exists "Admins can read auth audit events" on public.auth_audit_events;
create policy "Admins can read auth audit events"
on public.auth_audit_events for select
using (public.current_profile_role() = 'admin');

comment on table public.auth_audit_events is
  'Safe auth audit log. Never store passwords, access tokens, refresh tokens, or raw callback URLs here.';
