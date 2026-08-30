-- Migration: close out group א remaining stubs.
-- entity_types: add turnover_threshold. tags: category (text) -> tag_categories (lookup).
-- client_tags: add audit fields. All target tables are empty, so no data migration needed.
-- Source of truth: docs/entities/entity_types.md, tag_categories.md, tags.md, client_tags.md

-- ── entity_types ──

alter table entity_types add column turnover_threshold numeric(12,2);

-- ── tag_categories (new lookup, replaces tags.category free text) ──

create table tag_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);
alter table tag_categories enable row level security;

-- ── tags: category (text) -> category_id (FK) ──

alter table tags drop constraint tags_category_name_key;
alter table tags drop column category;
alter table tags add column category_id uuid not null references tag_categories(id);
alter table tags add constraint tags_category_id_name_key unique (category_id, name);

-- ── client_tags: audit fields ──

alter table client_tags add column assigned_by uuid references office_employees(id);
alter table client_tags add column assigned_at timestamptz not null default now();
alter table client_tags add column is_automatic boolean not null default false;
