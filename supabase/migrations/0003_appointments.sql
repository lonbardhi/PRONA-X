do $$ begin
  create type public.appointment_type as enum (
    'viewing',
    'call',
    'follow_up',
    'photoshoot',
    'document_signing',
    'open_house'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.appointment_status as enum (
    'scheduled',
    'completed',
    'cancelled',
    'no_show'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  assigned_agent_id uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  title text not null,
  appointment_type public.appointment_type not null default 'viewing',
  status public.appointment_status not null default 'scheduled',
  client_name text not null,
  client_phone text,
  client_email text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_end_after_start check (ends_at > starts_at)
);

create index if not exists appointments_property_idx on public.appointments(property_id);
create index if not exists appointments_assigned_agent_idx on public.appointments(assigned_agent_id);
create index if not exists appointments_status_idx on public.appointments(status);
create index if not exists appointments_starts_at_idx on public.appointments(starts_at);
create index if not exists appointments_created_by_idx on public.appointments(created_by);

drop trigger if exists set_appointments_updated_at on public.appointments;
create trigger set_appointments_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

alter table public.appointments enable row level security;

drop policy if exists "Operators can view appointments" on public.appointments;
create policy "Operators can view appointments"
on public.appointments for select
using (
  auth.uid() is not null
  and (
    public.current_profile_role() in ('admin', 'manager')
    or created_by = auth.uid()
    or assigned_agent_id = auth.uid()
  )
);

drop policy if exists "Operators can create appointments" on public.appointments;
create policy "Operators can create appointments"
on public.appointments for insert
with check (
  auth.uid() is not null
  and public.current_profile_role() in ('admin', 'manager', 'agent')
  and created_by = auth.uid()
  and (
    public.current_profile_role() in ('admin', 'manager')
    or assigned_agent_id = auth.uid()
    or assigned_agent_id is null
  )
);

drop policy if exists "Operators can update appointments" on public.appointments;
create policy "Operators can update appointments"
on public.appointments for update
using (
  public.current_profile_role() in ('admin', 'manager')
  or created_by = auth.uid()
  or assigned_agent_id = auth.uid()
)
with check (
  public.current_profile_role() in ('admin', 'manager')
  or created_by = auth.uid()
  or assigned_agent_id = auth.uid()
);

drop policy if exists "Operators can delete appointments" on public.appointments;
create policy "Operators can delete appointments"
on public.appointments for delete
using (
  public.current_profile_role() in ('admin', 'manager')
  or created_by = auth.uid()
);

select to_regclass('public.appointments') as appointments;
