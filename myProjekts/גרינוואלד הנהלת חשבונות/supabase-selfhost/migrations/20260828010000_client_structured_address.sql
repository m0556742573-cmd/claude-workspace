-- Migration: split clients.address into structured fields (street/city/postal code)
-- Source of truth: docs/entities/clients.md

alter table clients drop column address;
alter table clients add column street_address text;
alter table clients add column city text;
alter table clients add column postal_code text;

create index idx_clients_city on clients(city);
