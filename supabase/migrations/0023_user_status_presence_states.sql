alter table public.user_status
  drop constraint if exists user_status_status_check;

alter table public.user_status
  add constraint user_status_status_check check (
    status in (
      'available',
      'away',
      'in_meeting',
      'property_visit',
      'driving',
      'do_not_disturb',
      'offline',
      'vacation'
    )
  );

drop policy if exists "Users can read own status" on public.user_status;
drop policy if exists "Approved staff can read team status" on public.user_status;

create policy "Approved staff can read team status"
on public.user_status for select
using (
  user_id = auth.uid()
  or public.current_profile_role() in ('admin', 'manager', 'agent', 'support')
);
