-- Run 0006a_add_pending_role.sql first, then run this migration.

alter table public.profiles
  alter column role set default 'pending';

update public.profiles
set role = 'pending'
where role = 'viewer';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email,
    'pending'
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(profiles.full_name, excluded.full_name);

  return new;
end;
$$;

drop policy if exists "Operators can view assigned portfolio" on public.properties;
drop policy if exists "Operators and viewers can view allowed portfolio" on public.properties;
create policy "Operators and viewers can view allowed portfolio"
on public.properties for select
using (
  auth.uid() is not null
  and (
    public.current_profile_role() in ('admin', 'manager')
    or created_by = auth.uid()
    or assigned_agent_id = auth.uid()
    or (
      public.current_profile_role() = 'viewer'
      and (
        status = 'published'
        or (
          type::text = 'development_land'
          and visibility = 'available_to_developers'
        )
      )
    )
  )
);

drop policy if exists "Media follows property visibility" on public.property_media;
create policy "Media follows property visibility"
on public.property_media for select
using (
  exists (
    select 1 from public.properties p
    where p.id = property_id
    and (
      p.status = 'published'
      or public.current_profile_role() in ('admin', 'manager')
      or p.created_by = auth.uid()
      or p.assigned_agent_id = auth.uid()
      or (
        public.current_profile_role() = 'viewer'
        and p.type::text = 'development_land'
        and p.visibility = 'available_to_developers'
      )
    )
  )
);
