-- Keeps property creation safe even if an old client or cached form omits visibility.
alter table public.properties
  alter column visibility set default 'internal_only';

update public.properties
set visibility = 'internal_only'
where visibility is null;

alter table public.properties
  alter column visibility set not null;

notify pgrst, 'reload schema';
