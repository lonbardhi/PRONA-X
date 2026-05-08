alter table public.profiles
  add column if not exists email text;

update public.profiles profile
set email = auth_user.email
from auth.users auth_user
where profile.id = auth_user.id
  and profile.email is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(profiles.full_name, excluded.full_name);

  return new;
end;
$$;

drop policy if exists "Users can update their profile" on public.profiles;
drop policy if exists "Users can update their profile details" on public.profiles;

create policy "Users can update their profile details"
on public.profiles for update
using (id = auth.uid())
with check (
  id = auth.uid()
  and role = public.current_profile_role()
);

comment on policy "Users can update their profile details" on public.profiles
is 'Users may update their own profile details, but cannot promote their own role. Admins manage role approval through the admin policy.';
