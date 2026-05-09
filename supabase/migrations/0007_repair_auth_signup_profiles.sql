alter table public.profiles
  add column if not exists email text;

update public.profiles profile
set email = auth_user.email
from auth.users auth_user
where profile.id = auth_user.id
  and profile.email is null;

alter table public.profiles
  alter column role set default 'pending';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.profiles as profile (id, full_name, email, role)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
      new.email,
      'pending'
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

select 'auth signup profile trigger repaired' as status;
