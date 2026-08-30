-- Migration: contacts architecture (7 new tables) + updates to clients/office_employees/client_notes
-- Source of truth: docs/entities/*.md — keep in sync if this file changes.

-- ════════════════════════════════════════════════════════
-- New independent lookups
-- ════════════════════════════════════════════════════════

-- docs/entities/employee_roles.md
create table employee_roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

-- docs/entities/responsibility_areas.md
create table responsibility_areas (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

-- docs/entities/contacts.md
create table contacts (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text,
  id_number text,
  street_address text,
  city text,
  postal_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_contacts_updated_at before update on contacts
  for each row execute function set_updated_at();

-- ════════════════════════════════════════════════════════
-- Structural sub-tables of contacts
-- ════════════════════════════════════════════════════════

-- docs/entities/contact_channels.md
create table contact_channels (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  channel_type text not null check (channel_type in ('phone', 'email')),
  value text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index idx_contact_channels_one_primary
  on contact_channels(contact_id, channel_type) where is_primary;
create index idx_contact_channels_contact on contact_channels(contact_id);

-- ════════════════════════════════════════════════════════
-- client ↔ contact relationship
-- ════════════════════════════════════════════════════════

-- docs/entities/client_contacts.md
create table client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  role text not null check (role in ('signatory', 'primary', 'auditor', 'tax_assessor', 'bank_rep', 'other')),
  created_at timestamptz not null default now(),
  unique (client_id, contact_id, role)
);
create index idx_client_contacts_client on client_contacts(client_id);
create index idx_client_contacts_contact on client_contacts(contact_id);

-- docs/entities/client_contact_responsibilities.md
create table client_contact_responsibilities (
  client_contact_id uuid not null references client_contacts(id) on delete cascade,
  responsibility_area_id uuid not null references responsibility_areas(id) on delete cascade,
  primary key (client_contact_id, responsibility_area_id)
);

-- ════════════════════════════════════════════════════════
-- Turnover history
-- ════════════════════════════════════════════════════════

-- docs/entities/client_turnover_history.md
create table client_turnover_history (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  year integer not null,
  actual_turnover numeric(12,2),
  expected_turnover numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, year)
);
create trigger trg_client_turnover_history_updated_at before update on client_turnover_history
  for each row execute function set_updated_at();
create index idx_client_turnover_history_client on client_turnover_history(client_id);

-- ════════════════════════════════════════════════════════
-- RLS: enabled with no policies yet, matching decisions/0005 —
-- raw psql runs (unlike the Studio SQL Editor) don't prompt/enable this automatically.
-- ════════════════════════════════════════════════════════

alter table employee_roles enable row level security;
alter table responsibility_areas enable row level security;
alter table contacts enable row level security;
alter table contact_channels enable row level security;
alter table client_contacts enable row level security;
alter table client_contact_responsibilities enable row level security;
alter table client_turnover_history enable row level security;

-- ════════════════════════════════════════════════════════
-- clients: remove signatory_* (moved to contacts), add new fields
-- ════════════════════════════════════════════════════════

alter table clients drop column signatory_first_name;
alter table clients drop column signatory_last_name;
alter table clients drop column signatory_id_number;

alter table clients add column website text;
alter table clients add column business_description text;
alter table clients add column sub_industry text;
alter table clients add column business_established_date date;
alter table clients add column economic_classification_code text;
alter table clients add column income_tax_file_number text;
alter table clients add column deductions_file_number text;
alter table clients add column social_security_file_number text;
alter table clients add column vat_station text;
alter table clients add column tax_officer text;
alter table clients add column engagement_start_date date;
alter table clients add column departure_reason text;
alter table clients add column general_notes text;

-- ════════════════════════════════════════════════════════
-- office_employees: role (text) -> role_id (FK)
-- ════════════════════════════════════════════════════════

alter table office_employees add column role_id uuid references employee_roles(id);
alter table office_employees drop column role;

-- ════════════════════════════════════════════════════════
-- client_notes: add role-scoped validity
-- ════════════════════════════════════════════════════════

alter table client_notes add column relevant_role_id uuid references employee_roles(id);
