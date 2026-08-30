-- Migration: client_contacts — add relationship history fields, replace blanket
-- unique constraint with a partial one (only one active person per role per client).
-- Source of truth: docs/entities/client_contacts.md

alter table client_contacts drop constraint client_contacts_client_id_contact_id_role_key;

alter table client_contacts add column position_at_business text;
alter table client_contacts add column responsible_since date;
alter table client_contacts add column ended_at date;
alter table client_contacts add column is_active boolean not null default true;

create unique index idx_client_contacts_one_active_role
  on client_contacts(client_id, role) where is_active;
