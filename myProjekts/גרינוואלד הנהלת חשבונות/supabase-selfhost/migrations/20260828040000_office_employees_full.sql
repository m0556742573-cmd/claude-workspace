-- Migration: full characterization of office_employees (was minimal skeleton).
-- Table is empty, so full_name is dropped and replaced rather than migrated.
-- Source of truth: docs/entities/office_employees.md

alter table office_employees drop column full_name;

alter table office_employees add column first_name text not null;
alter table office_employees add column last_name text;
alter table office_employees add column id_number text;
alter table office_employees add column phone text;
alter table office_employees add column email text;
alter table office_employees add column hire_date date;
alter table office_employees add column is_active boolean not null default true;
alter table office_employees add column departure_date date;
alter table office_employees add column departure_reason text;
