-- Migration: periods (full) + services (minimal skeleton).
-- Source of truth: docs/entities/periods.md, docs/entities/services.md
-- services intentionally minimal: supply_type/pricing_mode/billing_frequency/price history
-- deferred to a later deepening pass once the rest of group ב is characterized.

-- ── periods ──

create table periods (
  id uuid primary key default gen_random_uuid(),
  reporting_frequency_id uuid not null references reporting_frequencies(id),
  start_date date not null,
  end_date date not null,
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reporting_frequency_id, start_date, end_date)
);
alter table periods enable row level security;

-- ── services (minimal skeleton) ──

create table services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table services enable row level security;
