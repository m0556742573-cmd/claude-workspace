-- Migration: Client entity — full family (13 tables)
-- Source of truth: docs/entities/*.md — keep in sync if this file changes.
-- Order: independent lookups → clients → structural sub-tables of clients.

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ════════════════════════════════════════════════════════
-- Independent lookup tables (FK targets for clients)
-- ════════════════════════════════════════════════════════

-- docs/entities/entity_types.md
create table entity_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_entity_types_updated_at before update on entity_types
  for each row execute function set_updated_at();

-- docs/entities/reporting_frequencies.md
create table reporting_frequencies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  months_interval integer not null check (months_interval > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_reporting_frequencies_updated_at before update on reporting_frequencies
  for each row execute function set_updated_at();

-- docs/entities/client_statuses.md
create table client_statuses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  continues_collection boolean not null default false,
  created_at timestamptz not null default now()
);

-- docs/entities/office_employees.md
create table office_employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role text,
  hourly_cost numeric(10,2) check (hourly_cost >= 0),
  specializations text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_office_employees_updated_at before update on office_employees
  for each row execute function set_updated_at();

-- docs/entities/tags.md
create table tags (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (category, name)
);

-- ════════════════════════════════════════════════════════
-- clients — the central entity
-- docs/entities/clients.md
-- ════════════════════════════════════════════════════════

create table clients (
  id uuid primary key default gen_random_uuid(),

  signatory_first_name text,
  signatory_last_name text,
  signatory_id_number text,               -- text, not integer: leading zeros

  entity_type_id uuid not null references entity_types(id),
  legal_id_number text not null unique,   -- ח.פ./ת.ז./עמותה, text: leading zeros
  legal_name text not null,

  trade_name text,
  address text,
  industry text,

  vat_reporting_frequency_id uuid references reporting_frequencies(id),
  annual_report_frequency_id uuid references reporting_frequencies(id),  -- separate from VAT on purpose
  tax_authority_file_number text,

  status_id uuid not null references client_statuses(id),   -- default chosen by app, not DB
  responsible_employee_id uuid references office_employees(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_clients_updated_at before update on clients
  for each row execute function set_updated_at();
create index idx_clients_responsible_employee on clients(responsible_employee_id);
create index idx_clients_status on clients(status_id);

-- ════════════════════════════════════════════════════════
-- Structural sub-tables of clients (not independent entities)
-- ════════════════════════════════════════════════════════

-- docs/entities/client_contact_channels.md
create table client_contact_channels (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  channel_type text not null check (channel_type in ('phone', 'email')),
  value text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (channel_type, value)   -- prevents ambiguous Omnichannel match across two clients
);
create unique index idx_client_contact_channels_one_primary
  on client_contact_channels(client_id, channel_type) where is_primary;
create index idx_client_contact_channels_client on client_contact_channels(client_id);

-- docs/entities/client_bank_accounts.md
create table client_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  bank_name text not null,
  branch_number text,
  account_number text not null,
  created_at timestamptz not null default now()
);
create index idx_client_bank_accounts_client on client_bank_accounts(client_id);

-- docs/entities/client_professional_credentials.md
-- TODO: password_encrypted is a plain-text placeholder — no encryption strategy decided yet
-- (pgsodium / Supabase Vault). Do not put real credentials in here until that's resolved.
create table client_professional_credentials (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  system_name text not null,
  username text,
  password_encrypted text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_client_prof_creds_updated_at before update on client_professional_credentials
  for each row execute function set_updated_at();
create index idx_client_prof_creds_client on client_professional_credentials(client_id);

-- docs/entities/client_financial_credentials.md
-- TODO: same encryption caveat as client_professional_credentials.
create table client_financial_credentials (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  system_name text not null,
  username text,
  password_encrypted text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_client_fin_creds_updated_at before update on client_financial_credentials
  for each row execute function set_updated_at();
create index idx_client_fin_creds_client on client_financial_credentials(client_id);

-- docs/entities/client_notes.md
create table client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  content text not null,
  valid_until date,             -- date, not timestamptz: logical day-level validity
  created_by uuid references office_employees(id),
  created_at timestamptz not null default now()
);
create index idx_client_notes_client on client_notes(client_id);

-- docs/entities/client_tags.md
create table client_tags (
  client_id uuid not null references clients(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (client_id, tag_id)
);

-- docs/entities/clients_audit_log.md
create table clients_audit_log (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id),
  changed_field text not null,
  old_value text,
  new_value text,
  changed_by uuid references office_employees(id),
  changed_at timestamptz not null default now()
);
create index idx_clients_audit_log_client on clients_audit_log(client_id);

-- Trigger: log changes to the fields flagged as critical in docs/entities/clients_audit_log.md
-- (status, responsible employee, legal identity) — serves Goal 9 in overview.md.
-- TODO: `changed_by` cannot be populated yet — there is no auth/session context in place.
-- Once Supabase Auth is wired up, set it from a session variable (e.g. auth.uid()) here.
create or replace function log_client_changes()
returns trigger as $$
begin
  if new.status_id is distinct from old.status_id then
    insert into clients_audit_log (client_id, changed_field, old_value, new_value)
    values (new.id, 'status_id', old.status_id::text, new.status_id::text);
  end if;
  if new.responsible_employee_id is distinct from old.responsible_employee_id then
    insert into clients_audit_log (client_id, changed_field, old_value, new_value)
    values (new.id, 'responsible_employee_id', old.responsible_employee_id::text, new.responsible_employee_id::text);
  end if;
  if new.entity_type_id is distinct from old.entity_type_id then
    insert into clients_audit_log (client_id, changed_field, old_value, new_value)
    values (new.id, 'entity_type_id', old.entity_type_id::text, new.entity_type_id::text);
  end if;
  if new.legal_name is distinct from old.legal_name then
    insert into clients_audit_log (client_id, changed_field, old_value, new_value)
    values (new.id, 'legal_name', old.legal_name, new.legal_name);
  end if;
  if new.legal_id_number is distinct from old.legal_id_number then
    insert into clients_audit_log (client_id, changed_field, old_value, new_value)
    values (new.id, 'legal_id_number', old.legal_id_number, new.legal_id_number);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_clients_audit_log after update on clients
  for each row execute function log_client_changes();
