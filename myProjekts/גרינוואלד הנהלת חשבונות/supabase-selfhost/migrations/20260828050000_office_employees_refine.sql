-- Migration: office_employees — move person data to contacts (reuse existing
-- infrastructure instead of duplicating it), add real employment terms,
-- add employee_absences for temporary (non-permanent) unavailability.
-- Source of truth: docs/entities/office_employees.md, docs/entities/employee_absences.md

-- ── office_employees: drop duplicated person fields, link to contacts instead ──

alter table office_employees drop column first_name;
alter table office_employees drop column last_name;
alter table office_employees drop column id_number;
alter table office_employees drop column phone;
alter table office_employees drop column email;

alter table office_employees add column contact_id uuid references contacts(id);

-- ── office_employees: real employment terms ──

alter table office_employees add column employment_type text check (employment_type in ('employee', 'contractor'));
alter table office_employees add column employment_percentage numeric(5,2) check (employment_percentage >= 0 and employment_percentage <= 100);
alter table office_employees add column weekly_capacity_hours numeric(5,2) check (weekly_capacity_hours >= 0);

-- ── employee_absences: temporary unavailability, human-decided coverage ──

create table employee_absences (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references office_employees(id) on delete cascade,
  start_date date not null,
  end_date date,
  absence_type text check (absence_type in ('vacation', 'sick', 'other')),
  covering_employee_id uuid references office_employees(id),
  created_at timestamptz not null default now()
);
create index idx_employee_absences_employee on employee_absences(employee_id);
alter table employee_absences enable row level security;
