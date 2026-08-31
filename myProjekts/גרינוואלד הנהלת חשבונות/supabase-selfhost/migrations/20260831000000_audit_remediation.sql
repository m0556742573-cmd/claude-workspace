-- Migration: remediation of the architecture audit (2026-08-31).
-- Covers findings 1, 2 (lock only), 3, 5, 7, 8, 9, 10, 11, 13, 14, 15.
-- Finding 6 (splitting hourly_cost into its own table) is deliberately NOT here —
-- it is recorded as the preferred future solution, to be applied when auth/policies arrive.
-- Every table is empty, so drops and type changes need no data migration.
-- Source of truth: docs/entities/*.md, updated alongside this file.

-- ══════════════════════════════════════════════════════════
-- 01 — RLS on the tables from 20260828000000 that never got it in code.
-- (client_contact_channels / the two credential tables / clients_audit_log
--  are omitted on purpose: they are dropped further down and replaced.)
-- ══════════════════════════════════════════════════════════

alter table entity_types          enable row level security;
alter table reporting_frequencies enable row level security;
alter table client_statuses       enable row level security;
alter table office_employees      enable row level security;
alter table tags                  enable row level security;
alter table clients               enable row level security;
alter table client_bank_accounts  enable row level security;
alter table client_notes          enable row level security;
alter table client_tags           enable row level security;

-- ══════════════════════════════════════════════════════════
-- 07 — updated_at triggers missing on the two newest tables
-- ══════════════════════════════════════════════════════════

create trigger trg_periods_updated_at before update on periods
  for each row execute function set_updated_at();
create trigger trg_services_updated_at before update on services
  for each row execute function set_updated_at();

-- ══════════════════════════════════════════════════════════
-- 11 — range integrity: a period that ends before it starts must not exist
-- ══════════════════════════════════════════════════════════

alter table periods add constraint periods_dates_ordered
  check (end_date >= start_date);
alter table employee_absences add constraint employee_absences_dates_ordered
  check (end_date is null or end_date >= start_date);
alter table client_contacts add constraint client_contacts_dates_ordered
  check (ended_at is null or responsible_since is null or ended_at >= responsible_since);
alter table client_turnover_history add constraint client_turnover_history_year_range
  check (year between 1990 and 2100);

-- ══════════════════════════════════════════════════════════
-- 13 — legal_id_number: required only once the client is active.
-- The DB constraint states what is true always (uniqueness);
-- the state-transition rule lives in a trigger so that n8n, Studio and any
-- future frontend are all held to it, not just the backend.
-- ══════════════════════════════════════════════════════════

alter table clients alter column legal_id_number drop not null;

create or replace function enforce_legal_id_when_active()
returns trigger as $$
declare
  status_code text;
begin
  select code into status_code from client_statuses where id = new.status_id;
  if status_code = 'active' and new.legal_id_number is null then
    raise exception 'client cannot be set to active status without legal_id_number (client %)', new.id
      using hint = 'fill the legal id, or keep the client in an onboarding status';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_clients_legal_id_gate
  before insert or update on clients
  for each row execute function enforce_legal_id_when_active();

-- ══════════════════════════════════════════════════════════
-- 14 — office_employees.contact_id: exactly one person per employee record
-- ══════════════════════════════════════════════════════════

alter table office_employees alter column contact_id set not null;
alter table office_employees add constraint office_employees_contact_id_key unique (contact_id);

-- ══════════════════════════════════════════════════════════
-- 15 — specializations: text[] -> lookup + M2M, matching responsibility_areas
-- ══════════════════════════════════════════════════════════

alter table office_employees drop column specializations;

create table specializations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);
alter table specializations enable row level security;

create table employee_specializations (
  employee_id uuid not null references office_employees(id) on delete cascade,
  specialization_id uuid not null references specializations(id) on delete cascade,
  primary key (employee_id, specialization_id)
);
alter table employee_specializations enable row level security;

-- ══════════════════════════════════════════════════════════
-- 10 — CHECK lists that belong to the firm become lookups.
-- Rule adopted: lookup when the list may grow from the firm's needs or the value
-- carries attributes; CHECK when the list is technically closed and code depends
-- on the exact values (channel_type, employment_type stay as CHECK).
-- ══════════════════════════════════════════════════════════

create table client_contact_roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);
alter table client_contact_roles enable row level security;

drop index idx_client_contacts_one_active_role;
alter table client_contacts drop column role;
alter table client_contacts add column role_id uuid not null references client_contact_roles(id);
create unique index idx_client_contacts_one_active_role
  on client_contacts(client_id, role_id) where is_active;

create table absence_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);
alter table absence_types enable row level security;

alter table employee_absences drop column absence_type;
alter table employee_absences add column absence_type_id uuid references absence_types(id);

-- ══════════════════════════════════════════════════════════
-- 02 + 05 — the two credential tables were structurally identical; they merge
-- into one table with a type, so encryption and auditing are implemented once.
-- The password column is renamed to stop promising encryption and locked to NULL
-- until the encryption decision is made.
-- ══════════════════════════════════════════════════════════

create table credential_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);
alter table credential_types enable row level security;

create table client_credentials (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete restrict,
  credential_type_id uuid not null references credential_types(id),
  system_name text not null,
  username text,
  identification_type text,
  valid_until date,
  notes text,
  password_pending_encryption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_credentials_no_plaintext_password
    check (password_pending_encryption is null)
);
alter table client_credentials enable row level security;
create trigger trg_client_credentials_updated_at before update on client_credentials
  for each row execute function set_updated_at();
create index idx_client_credentials_client on client_credentials(client_id);
create index idx_client_credentials_valid_until on client_credentials(valid_until);

drop table client_professional_credentials;
drop table client_financial_credentials;

-- ══════════════════════════════════════════════════════════
-- 08 + 05 — the two channel tables merge into one, so that a phone number or
-- address has exactly one owner and one global answer to "whose is this?".
-- Owner is a client (institutional: info@, switchboard) or a contact (a person).
-- The official channel of a client is a tag carried on a link row, one per type.
-- ══════════════════════════════════════════════════════════

create table channels (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete restrict,
  contact_id uuid references contacts(id) on delete restrict,
  channel_type text not null check (channel_type in ('phone', 'email')),
  value text not null,
  label text,
  description text,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint channels_exactly_one_owner check (num_nonnulls(client_id, contact_id) = 1),
  constraint channels_value_key unique (channel_type, value),
  constraint channels_id_type_key unique (id, channel_type)
);
alter table channels enable row level security;
create trigger trg_channels_updated_at before update on channels
  for each row execute function set_updated_at();
create unique index idx_channels_one_primary_client
  on channels(client_id, channel_type) where is_primary and client_id is not null;
create unique index idx_channels_one_primary_contact
  on channels(contact_id, channel_type) where is_primary and contact_id is not null;
create index idx_channels_client on channels(client_id);
create index idx_channels_contact on channels(contact_id);

-- The composite FK guarantees the stored type matches the channel's real type,
-- and the primary key guarantees one official channel per type per client.
create table client_official_channels (
  client_id uuid not null references clients(id) on delete restrict,
  channel_id uuid not null,
  channel_type text not null,
  created_at timestamptz not null default now(),
  primary key (client_id, channel_type),
  foreign key (channel_id, channel_type) references channels(id, channel_type)
);
alter table client_official_channels enable row level security;
create index idx_client_official_channels_channel on client_official_channels(channel_id);

drop table client_contact_channels;
drop table contact_channels;

-- ══════════════════════════════════════════════════════════
-- 03 — one generic audit table instead of a per-entity one, applied to clients
-- and to credentials. Audited columns are passed as trigger arguments.
-- Known gap: this logs UPDATE only. Logging INSERT/DELETE, and logging reads of
-- credentials, both need separate work (a read cannot be caught by a trigger).
-- ══════════════════════════════════════════════════════════

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  changed_field text not null,
  old_value text,
  new_value text,
  changed_by uuid references office_employees(id),
  changed_at timestamptz not null default now()
);
alter table audit_log enable row level security;
create index idx_audit_log_record on audit_log(table_name, record_id);
create index idx_audit_log_changed_at on audit_log(changed_at);

create or replace function log_audited_changes()
returns trigger as $$
declare
  col text;
  old_v text;
  new_v text;
begin
  foreach col in array tg_argv loop
    execute format('select ($1).%I::text, ($2).%I::text', col, col)
      into old_v, new_v using old, new;
    if old_v is distinct from new_v then
      insert into audit_log (table_name, record_id, changed_field, old_value, new_value)
      values (tg_table_name, new.id, col, old_v, new_v);
    end if;
  end loop;
  return new;
end;
$$ language plpgsql;

drop trigger trg_clients_audit_log on clients;
drop function log_client_changes();
drop table clients_audit_log;

create trigger trg_clients_audit after update on clients
  for each row execute function log_audited_changes(
    'status_id', 'responsible_employee_id', 'entity_type_id',
    'legal_name', 'legal_id_number', 'deleted_at');

create trigger trg_client_credentials_audit after update on client_credentials
  for each row execute function log_audited_changes(
    'credential_type_id', 'system_name', 'username',
    'identification_type', 'valid_until');

-- ══════════════════════════════════════════════════════════
-- 09 — deletion becomes deliberate. cascade is kept only for pure junction
-- tables that hold no independent information; everything that holds content
-- becomes restrict, so a client with any data cannot be deleted at all.
-- deleted_at is for "this row should never have existed" — a client who left
-- the firm is a status change, not a deletion.
-- ══════════════════════════════════════════════════════════

alter table clients add column deleted_at timestamptz;
create index idx_clients_deleted_at on clients(deleted_at) where deleted_at is null;

alter table client_bank_accounts drop constraint client_bank_accounts_client_id_fkey;
alter table client_bank_accounts add constraint client_bank_accounts_client_id_fkey
  foreign key (client_id) references clients(id) on delete restrict;

alter table client_notes drop constraint client_notes_client_id_fkey;
alter table client_notes add constraint client_notes_client_id_fkey
  foreign key (client_id) references clients(id) on delete restrict;

alter table client_turnover_history drop constraint client_turnover_history_client_id_fkey;
alter table client_turnover_history add constraint client_turnover_history_client_id_fkey
  foreign key (client_id) references clients(id) on delete restrict;

alter table client_contacts drop constraint client_contacts_client_id_fkey;
alter table client_contacts add constraint client_contacts_client_id_fkey
  foreign key (client_id) references clients(id) on delete restrict;
alter table client_contacts drop constraint client_contacts_contact_id_fkey;
alter table client_contacts add constraint client_contacts_contact_id_fkey
  foreign key (contact_id) references contacts(id) on delete restrict;

alter table employee_absences drop constraint employee_absences_employee_id_fkey;
alter table employee_absences add constraint employee_absences_employee_id_fkey
  foreign key (employee_id) references office_employees(id) on delete restrict;

-- Default read path, so callers do not have to remember the filter.
create view active_clients with (security_invoker = true) as
  select * from clients where deleted_at is null;

-- ══════════════════════════════════════════════════════════
-- 05 — fields present in the source specification and missing here.
-- "purpose" becomes a lookup per the rule adopted above: which account is used
-- for collection vs refunds is a list the firm will extend.
-- ══════════════════════════════════════════════════════════

create table bank_account_purposes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);
alter table bank_account_purposes enable row level security;

alter table client_bank_accounts add column bank_code text;
alter table client_bank_accounts add column account_holder_name text;
alter table client_bank_accounts add column purpose_id uuid references bank_account_purposes(id);
alter table client_bank_accounts add column notes text;
alter table client_bank_accounts add column is_active boolean not null default true;
