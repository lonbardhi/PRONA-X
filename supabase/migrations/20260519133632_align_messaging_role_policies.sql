-- Align internal messaging permissions with the current approved PRONA X roles.
-- The app allows approved operational/legal/finance staff to start internal
-- discussion threads, so the RLS INSERT policy must accept the same creator set.

create or replace function public.is_approved_messaging_role()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.current_profile_role()::text in (
      'admin',
      'manager',
      'agent',
      'support',
      'legal',
      'finance',
      'viewer'
    ),
    false
  );
$$;

drop policy if exists "Approved staff can view messaging profiles" on public.profiles;
create policy "Approved staff can view messaging profiles"
on public.profiles for select
using (
  id = auth.uid()
  or (
    public.current_profile_role()::text in (
      'admin',
      'manager',
      'agent',
      'support',
      'legal',
      'finance'
    )
    and role::text in (
      'admin',
      'manager',
      'agent',
      'support',
      'legal',
      'finance',
      'viewer'
    )
  )
);

drop policy if exists "Approved users can create conversations" on public.conversations;
create policy "Approved users can create conversations"
on public.conversations for insert
with check (
  auth.uid() is not null
  and created_by = auth.uid()
  and public.current_profile_role()::text in (
    'admin',
    'manager',
    'agent',
    'support',
    'legal',
    'finance'
  )
);

notify pgrst, 'reload schema';
