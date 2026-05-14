-- Documente, Oferta & Kontrata module.
-- Run after 0016_whatsapp_inbox.sql.

create extension if not exists "pgcrypto";

alter type public.app_role add value if not exists 'legal';
alter type public.app_role add value if not exists 'finance';

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
    and role::text in ('admin', 'manager', 'agent', 'viewer', 'support', 'legal', 'finance')
  limit 1;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'crm-documents',
  'crm-documents',
  false,
  52428800,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'application/zip'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  title text not null,
  category text not null,
  document_type text not null,
  status text not null default 'Uploaded',
  confidentiality_level text not null default 'internal',
  document_number text,
  notes text,
  expires_at date,
  current_version_id uuid,
  uploaded_by_user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  created_by_user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archive_reason text,
  constraint documents_category_check check (
    category in ('Pronesia', 'Kadastra', 'Identifikimi', 'Autorizime', 'Oferta', 'Kontrata', 'Financiare', 'Media', 'Teknike', 'Te tjera')
  ),
  constraint documents_status_check check (
    status in ('Draft', 'Uploaded', 'Pending Review', 'Approved', 'Rejected', 'Needs Changes', 'Generated', 'Signed', 'Expiring Soon', 'Expired', 'Archived', 'Quarantined')
  ),
  constraint documents_confidentiality_check check (
    confidentiality_level in ('public_share', 'internal', 'confidential', 'restricted')
  )
);

create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  workspace_id uuid,
  version_number integer not null check (version_number > 0),
  storage_key text not null,
  file_url text,
  file_name text not null,
  original_file_name text not null,
  file_size bigint not null check (file_size > 0),
  mime_type text not null,
  file_extension text not null,
  checksum_sha256 text,
  status text not null default 'Uploaded',
  change_notes text,
  created_by_user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint document_versions_unique_version unique (document_id, version_number),
  constraint document_versions_unique_storage_key unique (storage_key),
  constraint document_versions_status_check check (
    status in ('Draft', 'Uploaded', 'Pending Review', 'Approved', 'Rejected', 'Needs Changes', 'Generated', 'Signed', 'Expiring Soon', 'Expired', 'Archived', 'Quarantined')
  )
);

do $$
begin
  alter table public.documents
    add constraint documents_current_version_id_fkey
    foreign key (current_version_id)
    references public.document_versions(id)
    on delete set null;
exception
  when duplicate_object then null;
end $$;

create table if not exists public.document_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  document_id uuid not null references public.documents(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  created_by_user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint document_links_entity_type_check check (
    entity_type in ('property', 'owner', 'client', 'lead', 'deal', 'offer', 'contract', 'template', 'general')
  ),
  constraint document_links_unique_entity unique (workspace_id, document_id, entity_type, entity_id)
);

create table if not exists public.document_activity (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  action text not null,
  old_value_json jsonb,
  new_value_json jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.document_checklist_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  scope_type text not null,
  property_type text,
  contract_type text,
  required_document_type text not null,
  is_required boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_checklist_templates_scope_check check (
    scope_type in ('property', 'contract', 'offer')
  )
);

create table if not exists public.document_checklist_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  entity_type text not null,
  entity_id uuid not null,
  required_document_type text not null,
  linked_document_id uuid references public.documents(id) on delete set null,
  status text not null default 'Missing',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_checklist_items_status_check check (
    status in ('Missing', 'Uploaded', 'Pending Review', 'Approved', 'Rejected', 'Expired')
  ),
  constraint document_checklist_items_unique unique (workspace_id, entity_type, entity_id, required_document_type)
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  property_id uuid not null references public.properties(id) on delete restrict,
  deal_id uuid,
  title text not null,
  offer_type text not null default 'land_owner_percentage_offer',
  status text not null default 'Draft',
  land_area numeric(12, 2) check (land_area is null or land_area >= 0),
  owner_percentage numeric(5, 2) check (owner_percentage is null or owner_percentage > 0 and owner_percentage < 100),
  investor_percentage numeric(5, 2) check (investor_percentage is null or investor_percentage > 0 and investor_percentage < 100),
  estimated_sale_price numeric(14, 2) check (estimated_sale_price is null or estimated_sale_price >= 0),
  estimated_owner_value numeric(14, 2) check (estimated_owner_value is null or estimated_owner_value >= 0),
  valid_until date,
  created_by_user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  approved_by_user_id uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint offers_type_check check (
    offer_type in ('land_owner_percentage_offer', 'sale_offer', 'rental_offer', 'other')
  ),
  constraint offers_status_check check (
    status in ('Draft', 'Pending Approval', 'Approved', 'Sent to Owner', 'Accepted', 'Rejected', 'Superseded', 'Archived')
  ),
  constraint offers_percentages_sum_check check (
    owner_percentage is null
    or investor_percentage is null
    or round(owner_percentage + investor_percentage, 2) = 100
  )
);

create table if not exists public.offer_parties (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  offer_id uuid not null references public.offers(id) on delete cascade,
  owner_id uuid,
  display_name text,
  party_role text not null default 'owner',
  ownership_share numeric(5, 2) check (ownership_share is null or ownership_share >= 0 and ownership_share <= 100),
  created_at timestamptz not null default now(),
  constraint offer_parties_role_check check (
    party_role in ('owner', 'seller', 'buyer', 'investor', 'representative')
  )
);

create table if not exists public.offer_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  offer_id uuid not null references public.offers(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  status text not null default 'Draft',
  owner_percentage numeric(5, 2),
  investor_percentage numeric(5, 2),
  land_area numeric(12, 2),
  estimated_sale_price numeric(14, 2),
  calculation_snapshot_json jsonb not null default '{}'::jsonb,
  excel_document_id uuid references public.documents(id) on delete set null,
  pdf_document_id uuid references public.documents(id) on delete set null,
  change_notes text,
  created_by_user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  approved_by_user_id uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  constraint offer_versions_unique_version unique (offer_id, version_number),
  constraint offer_versions_status_check check (
    status in ('Draft', 'Pending Approval', 'Approved', 'Sent', 'Accepted', 'Rejected', 'Superseded')
  ),
  constraint offer_versions_percentages_sum_check check (
    owner_percentage is null
    or investor_percentage is null
    or round(owner_percentage + investor_percentage, 2) = 100
  )
);

create table if not exists public.offer_activity (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  offer_id uuid not null references public.offers(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  action text not null,
  old_value_json jsonb,
  new_value_json jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  contract_number text not null unique,
  title text not null,
  contract_type text not null,
  status text not null default 'Draft',
  property_id uuid references public.properties(id) on delete restrict,
  deal_id uuid,
  assigned_agent_id uuid references public.profiles(id) on delete set null,
  created_by_user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  legal_approved_by_user_id uuid references public.profiles(id) on delete set null,
  legal_approved_at timestamptz,
  manager_approved_by_user_id uuid references public.profiles(id) on delete set null,
  manager_approved_at timestamptz,
  finance_approved_by_user_id uuid references public.profiles(id) on delete set null,
  finance_approved_at timestamptz,
  start_date date,
  end_date date,
  signed_at timestamptz,
  active_at timestamptz,
  completed_at timestamptz,
  terminated_at timestamptz,
  termination_reason text,
  expires_at date,
  contract_data_json jsonb not null default '{}'::jsonb,
  confidentiality_level text not null default 'confidential',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archive_reason text,
  constraint contracts_type_check check (
    contract_type in ('rent_contract', 'buying_contract', 'reservation_contract', 'owner_mandate_contract', 'buyer_brokerage_contract', 'tenant_brokerage_contract', 'commission_agreement', 'annex', 'handover_protocol', 'termination_agreement')
  ),
  constraint contracts_status_check check (
    status in ('Draft', 'Pending Legal Review', 'Pending Finance Review', 'Pending Manager Approval', 'Approved', 'Sent for Signature', 'Partially Signed', 'Signature Declined', 'Signed', 'Active', 'Expiring Soon', 'Notary Scheduled', 'Closing in Progress', 'Completed', 'Expired', 'Renewed', 'Terminated', 'Cancelled', 'Rejected', 'Archived')
  ),
  constraint contracts_dates_check check (
    start_date is null or end_date is null or end_date > start_date
  ),
  constraint contracts_confidentiality_check check (
    confidentiality_level in ('internal', 'confidential', 'restricted')
  )
);

create table if not exists public.contract_parties (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  party_entity_type text,
  party_entity_id uuid,
  party_role text not null,
  display_name text not null,
  email text,
  phone text,
  id_number text,
  ownership_share numeric(5, 2) check (ownership_share is null or ownership_share >= 0 and ownership_share <= 100),
  required_to_sign boolean not null default true,
  signature_status text not null default 'Pending',
  signed_at timestamptz,
  signing_method text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contract_parties_role_check check (
    party_role in ('landlord', 'tenant', 'seller', 'buyer', 'owner', 'agent', 'agency', 'payer', 'representative', 'witness', 'notary', 'other')
  ),
  constraint contract_parties_signature_status_check check (
    signature_status in ('Not Required', 'Pending', 'Sent', 'Signed', 'Signed Manually', 'Declined', 'Expired')
  )
);

create table if not exists public.contract_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  status text not null default 'Draft',
  draft_document_id uuid references public.documents(id) on delete set null,
  generated_pdf_document_id uuid references public.documents(id) on delete set null,
  signed_document_id uuid references public.documents(id) on delete set null,
  snapshot_json jsonb not null default '{}'::jsonb,
  change_notes text,
  created_by_user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint contract_versions_unique_version unique (contract_id, version_number)
);

create table if not exists public.contract_approvals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  contract_version_id uuid references public.contract_versions(id) on delete cascade,
  approval_type text not null,
  status text not null default 'Pending',
  requested_by_user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  assigned_to_user_id uuid references public.profiles(id) on delete set null,
  decided_by_user_id uuid references public.profiles(id) on delete set null,
  decision_reason text,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  constraint contract_approvals_type_check check (
    approval_type in ('legal', 'manager', 'finance')
  ),
  constraint contract_approvals_status_check check (
    status in ('Pending', 'Approved', 'Rejected', 'Cancelled')
  )
);

create table if not exists public.contract_payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  payment_name text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null default 'EUR',
  due_date date,
  paid_at timestamptz,
  status text not null default 'Unpaid',
  payer_party_id uuid references public.contract_parties(id) on delete set null,
  receiver_party_id uuid references public.contract_parties(id) on delete set null,
  proof_document_id uuid references public.documents(id) on delete set null,
  required_for_completion boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contract_payments_status_check check (
    status in ('Unpaid', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled')
  )
);

create table if not exists public.contract_activity (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  action text not null,
  old_value_json jsonb,
  new_value_json jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists documents_workspace_idx on public.documents(workspace_id);
create index if not exists documents_status_idx on public.documents(status);
create index if not exists documents_category_idx on public.documents(category);
create index if not exists documents_type_idx on public.documents(document_type);
create index if not exists documents_expires_at_idx on public.documents(expires_at);
create index if not exists documents_created_at_idx on public.documents(created_at desc);
create index if not exists documents_current_version_idx on public.documents(current_version_id);
create index if not exists document_versions_document_idx on public.document_versions(document_id, version_number desc);
create index if not exists document_links_entity_idx on public.document_links(entity_type, entity_id);
create unique index if not exists document_links_unique_entity_coalesced_idx
  on public.document_links(coalesce(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid), document_id, entity_type, entity_id);
create index if not exists document_activity_document_idx on public.document_activity(document_id, created_at desc);
create index if not exists document_checklist_items_entity_idx on public.document_checklist_items(entity_type, entity_id);
create unique index if not exists document_checklist_items_unique_coalesced_idx
  on public.document_checklist_items(coalesce(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid), entity_type, entity_id, required_document_type);
create index if not exists offers_property_idx on public.offers(property_id);
create index if not exists offers_status_idx on public.offers(status);
create index if not exists offers_created_at_idx on public.offers(created_at desc);
create index if not exists offer_versions_offer_idx on public.offer_versions(offer_id, version_number desc);
create index if not exists offer_activity_offer_idx on public.offer_activity(offer_id, created_at desc);
create index if not exists contracts_property_idx on public.contracts(property_id);
create index if not exists contracts_status_idx on public.contracts(status);
create index if not exists contracts_type_idx on public.contracts(contract_type);
create index if not exists contracts_expires_at_idx on public.contracts(expires_at);
create index if not exists contracts_created_at_idx on public.contracts(created_at desc);
create index if not exists contract_parties_contract_idx on public.contract_parties(contract_id);
create index if not exists contract_versions_contract_idx on public.contract_versions(contract_id, version_number desc);
create index if not exists contract_approvals_contract_idx on public.contract_approvals(contract_id, status);
create index if not exists contract_payments_contract_idx on public.contract_payments(contract_id, status);
create index if not exists contract_activity_contract_idx on public.contract_activity(contract_id, created_at desc);

drop trigger if exists set_documents_updated_at on public.documents;
create trigger set_documents_updated_at before update on public.documents
for each row execute function public.set_updated_at();

drop trigger if exists set_document_checklist_templates_updated_at on public.document_checklist_templates;
create trigger set_document_checklist_templates_updated_at before update on public.document_checklist_templates
for each row execute function public.set_updated_at();

drop trigger if exists set_document_checklist_items_updated_at on public.document_checklist_items;
create trigger set_document_checklist_items_updated_at before update on public.document_checklist_items
for each row execute function public.set_updated_at();

drop trigger if exists set_offers_updated_at on public.offers;
create trigger set_offers_updated_at before update on public.offers
for each row execute function public.set_updated_at();

drop trigger if exists set_contracts_updated_at on public.contracts;
create trigger set_contracts_updated_at before update on public.contracts
for each row execute function public.set_updated_at();

drop trigger if exists set_contract_parties_updated_at on public.contract_parties;
create trigger set_contract_parties_updated_at before update on public.contract_parties
for each row execute function public.set_updated_at();

drop trigger if exists set_contract_payments_updated_at on public.contract_payments;
create trigger set_contract_payments_updated_at before update on public.contract_payments
for each row execute function public.set_updated_at();

alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.document_links enable row level security;
alter table public.document_activity enable row level security;
alter table public.document_checklist_templates enable row level security;
alter table public.document_checklist_items enable row level security;
alter table public.offers enable row level security;
alter table public.offer_parties enable row level security;
alter table public.offer_versions enable row level security;
alter table public.offer_activity enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_parties enable row level security;
alter table public.contract_versions enable row level security;
alter table public.contract_approvals enable row level security;
alter table public.contract_payments enable row level security;
alter table public.contract_activity enable row level security;

grant select, insert, update, delete on public.documents to authenticated;
grant select, insert on public.document_versions to authenticated;
grant select, insert, delete on public.document_links to authenticated;
grant select, insert on public.document_activity to authenticated;
grant select on public.document_checklist_templates to authenticated;
grant select, insert, update on public.document_checklist_items to authenticated;
grant select, insert, update on public.offers to authenticated;
grant select, insert, update on public.offer_parties to authenticated;
grant select, insert, update on public.offer_versions to authenticated;
grant select, insert on public.offer_activity to authenticated;
grant select, insert, update on public.contracts to authenticated;
grant select, insert, update on public.contract_parties to authenticated;
grant select, insert, update on public.contract_versions to authenticated;
grant select, insert, update on public.contract_approvals to authenticated;
grant select, insert, update on public.contract_payments to authenticated;
grant select, insert on public.contract_activity to authenticated;

drop policy if exists "Approved CRM users can read documents" on public.documents;
create policy "Approved CRM users can read documents"
on public.documents for select
using (public.current_profile_role()::text in ('admin', 'manager', 'agent', 'viewer', 'legal', 'finance'));

drop policy if exists "Operators can create documents" on public.documents;
create policy "Operators can create documents"
on public.documents for insert
with check (
  public.current_profile_role()::text in ('admin', 'manager', 'agent', 'legal', 'finance')
  and coalesce(created_by_user_id, auth.uid()) = auth.uid()
);

drop policy if exists "Operators can update documents" on public.documents;
create policy "Operators can update documents"
on public.documents for update
using (public.current_profile_role()::text in ('admin', 'manager', 'agent', 'legal', 'finance'))
with check (public.current_profile_role()::text in ('admin', 'manager', 'agent', 'legal', 'finance'));

drop policy if exists "Operators can delete own failed document uploads" on public.documents;
create policy "Operators can delete own failed document uploads"
on public.documents for delete
using (
  public.current_profile_role()::text in ('admin', 'manager', 'agent', 'legal', 'finance')
  and created_by_user_id = auth.uid()
  and status in ('Draft', 'Uploaded')
  and created_at > now() - interval '15 minutes'
);

drop policy if exists "Approved CRM users can read document versions" on public.document_versions;
create policy "Approved CRM users can read document versions"
on public.document_versions for select
using (
  exists (
    select 1 from public.documents document
    where document.id = document_versions.document_id
      and public.current_profile_role()::text in ('admin', 'manager', 'agent', 'viewer', 'legal', 'finance')
  )
);

drop policy if exists "Operators can create document versions" on public.document_versions;
create policy "Operators can create document versions"
on public.document_versions for insert
with check (
  public.current_profile_role()::text in ('admin', 'manager', 'agent', 'legal', 'finance')
  and coalesce(created_by_user_id, auth.uid()) = auth.uid()
);

drop policy if exists "Approved CRM users can read document links" on public.document_links;
create policy "Approved CRM users can read document links"
on public.document_links for select
using (public.current_profile_role()::text in ('admin', 'manager', 'agent', 'viewer', 'legal', 'finance'));

drop policy if exists "Operators can create document links" on public.document_links;
create policy "Operators can create document links"
on public.document_links for insert
with check (
  public.current_profile_role()::text in ('admin', 'manager', 'agent', 'legal', 'finance')
  and coalesce(created_by_user_id, auth.uid()) = auth.uid()
);

drop policy if exists "Managers can delete document links" on public.document_links;
create policy "Managers can delete document links"
on public.document_links for delete
using (public.current_profile_role()::text in ('admin', 'manager'));

drop policy if exists "Approved CRM users can read document activity" on public.document_activity;
create policy "Approved CRM users can read document activity"
on public.document_activity for select
using (public.current_profile_role()::text in ('admin', 'manager', 'agent', 'viewer', 'legal', 'finance'));

drop policy if exists "Operators can log document activity" on public.document_activity;
create policy "Operators can log document activity"
on public.document_activity for insert
with check (
  public.current_profile_role()::text in ('admin', 'manager', 'agent', 'legal', 'finance')
  and (user_id is null or user_id = auth.uid())
);

drop policy if exists "Approved CRM users can read checklist templates" on public.document_checklist_templates;
create policy "Approved CRM users can read checklist templates"
on public.document_checklist_templates for select
using (public.current_profile_role()::text in ('admin', 'manager', 'agent', 'viewer', 'legal', 'finance'));

drop policy if exists "Approved CRM users can read checklist items" on public.document_checklist_items;
create policy "Approved CRM users can read checklist items"
on public.document_checklist_items for select
using (public.current_profile_role()::text in ('admin', 'manager', 'agent', 'viewer', 'legal', 'finance'));

drop policy if exists "Operators can manage checklist items" on public.document_checklist_items;
create policy "Operators can manage checklist items"
on public.document_checklist_items for all
using (public.current_profile_role()::text in ('admin', 'manager', 'agent', 'legal', 'finance'))
with check (public.current_profile_role()::text in ('admin', 'manager', 'agent', 'legal', 'finance'));

drop policy if exists "Approved CRM users can read offers" on public.offers;
create policy "Approved CRM users can read offers"
on public.offers for select
using (public.current_profile_role()::text in ('admin', 'manager', 'agent', 'viewer', 'legal', 'finance'));

drop policy if exists "Operators can create offers" on public.offers;
create policy "Operators can create offers"
on public.offers for insert
with check (
  public.current_profile_role()::text in ('admin', 'manager', 'agent')
  and coalesce(created_by_user_id, auth.uid()) = auth.uid()
);

drop policy if exists "Operators can update offers" on public.offers;
create policy "Operators can update offers"
on public.offers for update
using (public.current_profile_role()::text in ('admin', 'manager', 'agent'))
with check (public.current_profile_role()::text in ('admin', 'manager', 'agent'));

drop policy if exists "Approved CRM users can read offer children" on public.offer_parties;
create policy "Approved CRM users can read offer children"
on public.offer_parties for select
using (public.current_profile_role()::text in ('admin', 'manager', 'agent', 'viewer', 'legal', 'finance'));

drop policy if exists "Operators can manage offer parties" on public.offer_parties;
create policy "Operators can manage offer parties"
on public.offer_parties for all
using (public.current_profile_role()::text in ('admin', 'manager', 'agent'))
with check (public.current_profile_role()::text in ('admin', 'manager', 'agent'));

drop policy if exists "Approved CRM users can read offer versions" on public.offer_versions;
create policy "Approved CRM users can read offer versions"
on public.offer_versions for select
using (public.current_profile_role()::text in ('admin', 'manager', 'agent', 'viewer', 'legal', 'finance'));

drop policy if exists "Operators can manage offer versions" on public.offer_versions;
create policy "Operators can manage offer versions"
on public.offer_versions for all
using (public.current_profile_role()::text in ('admin', 'manager', 'agent'))
with check (public.current_profile_role()::text in ('admin', 'manager', 'agent'));

drop policy if exists "Approved CRM users can read offer activity" on public.offer_activity;
create policy "Approved CRM users can read offer activity"
on public.offer_activity for select
using (public.current_profile_role()::text in ('admin', 'manager', 'agent', 'viewer', 'legal', 'finance'));

drop policy if exists "Operators can log offer activity" on public.offer_activity;
create policy "Operators can log offer activity"
on public.offer_activity for insert
with check (
  public.current_profile_role()::text in ('admin', 'manager', 'agent')
  and (user_id is null or user_id = auth.uid())
);

drop policy if exists "Approved CRM users can read contracts" on public.contracts;
create policy "Approved CRM users can read contracts"
on public.contracts for select
using (public.current_profile_role()::text in ('admin', 'manager', 'agent', 'viewer', 'legal', 'finance'));

drop policy if exists "Authorized users can create contracts" on public.contracts;
create policy "Authorized users can create contracts"
on public.contracts for insert
with check (
  public.current_profile_role()::text in ('admin', 'manager', 'agent', 'legal')
  and coalesce(created_by_user_id, auth.uid()) = auth.uid()
);

drop policy if exists "Authorized users can update contracts" on public.contracts;
create policy "Authorized users can update contracts"
on public.contracts for update
using (public.current_profile_role()::text in ('admin', 'manager', 'agent', 'legal', 'finance'))
with check (public.current_profile_role()::text in ('admin', 'manager', 'agent', 'legal', 'finance'));

drop policy if exists "Approved CRM users can read contract children" on public.contract_parties;
create policy "Approved CRM users can read contract children"
on public.contract_parties for select
using (public.current_profile_role()::text in ('admin', 'manager', 'agent', 'viewer', 'legal', 'finance'));

drop policy if exists "Authorized users can manage contract parties" on public.contract_parties;
create policy "Authorized users can manage contract parties"
on public.contract_parties for all
using (public.current_profile_role()::text in ('admin', 'manager', 'agent', 'legal'))
with check (public.current_profile_role()::text in ('admin', 'manager', 'agent', 'legal'));

drop policy if exists "Approved CRM users can read contract versions" on public.contract_versions;
create policy "Approved CRM users can read contract versions"
on public.contract_versions for select
using (public.current_profile_role()::text in ('admin', 'manager', 'agent', 'viewer', 'legal', 'finance'));

drop policy if exists "Authorized users can manage contract versions" on public.contract_versions;
create policy "Authorized users can manage contract versions"
on public.contract_versions for all
using (public.current_profile_role()::text in ('admin', 'manager', 'agent', 'legal'))
with check (public.current_profile_role()::text in ('admin', 'manager', 'agent', 'legal'));

drop policy if exists "Approved CRM users can read contract approvals" on public.contract_approvals;
create policy "Approved CRM users can read contract approvals"
on public.contract_approvals for select
using (public.current_profile_role()::text in ('admin', 'manager', 'agent', 'viewer', 'legal', 'finance'));

drop policy if exists "Approvers can manage contract approvals" on public.contract_approvals;
create policy "Approvers can manage contract approvals"
on public.contract_approvals for all
using (public.current_profile_role()::text in ('admin', 'manager', 'legal', 'finance'))
with check (public.current_profile_role()::text in ('admin', 'manager', 'legal', 'finance'));

drop policy if exists "Approved CRM users can read contract payments" on public.contract_payments;
create policy "Approved CRM users can read contract payments"
on public.contract_payments for select
using (public.current_profile_role()::text in ('admin', 'manager', 'agent', 'viewer', 'legal', 'finance'));

drop policy if exists "Finance users can manage contract payments" on public.contract_payments;
create policy "Finance users can manage contract payments"
on public.contract_payments for all
using (public.current_profile_role()::text in ('admin', 'manager', 'finance'))
with check (public.current_profile_role()::text in ('admin', 'manager', 'finance'));

drop policy if exists "Approved CRM users can read contract activity" on public.contract_activity;
create policy "Approved CRM users can read contract activity"
on public.contract_activity for select
using (public.current_profile_role()::text in ('admin', 'manager', 'agent', 'viewer', 'legal', 'finance'));

drop policy if exists "Authorized users can log contract activity" on public.contract_activity;
create policy "Authorized users can log contract activity"
on public.contract_activity for insert
with check (
  public.current_profile_role()::text in ('admin', 'manager', 'agent', 'legal', 'finance')
  and (user_id is null or user_id = auth.uid())
);

drop policy if exists "CRM users can upload private documents" on storage.objects;
create policy "CRM users can upload private documents"
on storage.objects for insert
with check (
  bucket_id = 'crm-documents'
  and auth.uid() is not null
  and public.current_profile_role()::text in ('admin', 'manager', 'agent', 'legal', 'finance')
);

drop policy if exists "CRM users can read private documents" on storage.objects;
create policy "CRM users can read private documents"
on storage.objects for select
using (
  bucket_id = 'crm-documents'
  and public.current_profile_role()::text in ('admin', 'manager', 'agent', 'viewer', 'legal', 'finance')
  and exists (
    select 1
    from public.document_versions version
    join public.documents document on document.id = version.document_id
    where version.storage_key = name
      and document.status <> 'Archived'
  )
);

insert into public.document_checklist_templates (scope_type, property_type, contract_type, required_document_type, sort_order)
values
  ('property', 'development_land', null, 'Ownership certificate', 10),
  ('property', 'development_land', null, 'Cadastral map', 20),
  ('property', 'development_land', null, 'Owner ID', 30),
  ('property', 'development_land', null, 'Authorization agreement', 40),
  ('property', 'development_land', null, 'Land photos', 50),
  ('offer', 'development_land', null, 'Excel Offer', 60),
  ('offer', 'development_land', null, 'Offer PDF', 70),
  ('offer', 'development_land', null, 'Signed Offer', 80),
  ('contract', null, 'rent_contract', 'Landlord ID', 10),
  ('contract', null, 'rent_contract', 'Tenant ID', 20),
  ('contract', null, 'rent_contract', 'Property document', 30),
  ('contract', null, 'rent_contract', 'Draft rent contract', 40),
  ('contract', null, 'rent_contract', 'Signed rent contract', 50),
  ('contract', null, 'rent_contract', 'Deposit proof', 60),
  ('contract', null, 'rent_contract', 'Handover protocol', 70),
  ('contract', null, 'buying_contract', 'Seller ID', 10),
  ('contract', null, 'buying_contract', 'Buyer ID', 20),
  ('contract', null, 'buying_contract', 'Ownership certificate', 30),
  ('contract', null, 'buying_contract', 'Property document', 40),
  ('contract', null, 'buying_contract', 'Agreed offer or reservation', 50),
  ('contract', null, 'buying_contract', 'Draft contract', 60),
  ('contract', null, 'buying_contract', 'Signed contract', 70),
  ('contract', null, 'buying_contract', 'Payment proof', 80),
  ('contract', null, 'buying_contract', 'Notary document', 90),
  ('contract', null, 'buying_contract', 'Ownership transfer document', 100),
  ('contract', null, 'reservation_contract', 'Buyer ID', 10),
  ('contract', null, 'reservation_contract', 'Seller/Owner ID', 20),
  ('contract', null, 'reservation_contract', 'Property document', 30),
  ('contract', null, 'reservation_contract', 'Reservation agreement', 40),
  ('contract', null, 'reservation_contract', 'Payment proof', 50),
  ('contract', null, 'owner_mandate_contract', 'Owner ID', 10),
  ('contract', null, 'owner_mandate_contract', 'Property document', 20),
  ('contract', null, 'owner_mandate_contract', 'Authorization agreement', 30),
  ('contract', null, 'owner_mandate_contract', 'Signed mandate', 40)
on conflict do nothing;

notify pgrst, 'reload schema';
