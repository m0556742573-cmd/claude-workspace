-- Migration: office_settings (entity 33) -- the thresholds the office owns.
--
-- The source: "a root entity with a single record. Every threshold somebody might
-- want to change (reminder days, quiet threshold, red threshold, stuck-task
-- threshold) lives here. Global resolution only at this stage -- not per client."
--
-- ⚠️ WHY TYPED COLUMNS IN ONE ROW AND NOT KEY-VALUE, decided against ADR 0009 and
-- landing on the same answer the ADR gives:
--
-- A setting's VALUE is data -- the office changes it whenever it likes, and that
-- is an UPDATE, not a migration. A setting's EXISTENCE is structure, because code
-- has to read it and do something with it. A new setting therefore needs code no
-- matter how it is stored, and a key-value table would only hide that behind a
-- row that nothing consumes.
--
-- Typed columns also get real constraints. "reminder days = -3" is caught here and
-- would not be in a text value column.
--
-- Single row enforced by a one-row constraint rather than by convention, because a
-- second settings row is the kind of thing that produces two different answers to
-- the same question and no error.
--
-- Source of truth: docs/entities/office_settings.md

create table office_settings (
  id                            uuid primary key default gen_random_uuid(),

  -- How many days before a deadline the client should be reminded. The only one
  -- entity 34 needs today; the rest are seeded at the source's named values so
  -- they exist when their engines are built.
  reminder_days_before          integer not null default 7
                                check (reminder_days_before between 0 and 90),

  -- A client nobody has spoken to in this many days is "quiet" -- goal 8.
  quiet_client_days             integer not null default 60
                                check (quiet_client_days between 1 and 365),

  -- Debt older than this many days is flagged red -- goal 7.
  overdue_collection_days       integer not null default 30
                                check (overdue_collection_days between 1 and 365),

  -- A task untouched for this many days is stuck.
  stuck_task_days               integer not null default 14
                                check (stuck_task_days between 1 and 365),

  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),

  -- Exactly one row, enforced rather than assumed.
  singleton                     boolean not null default true
                                unique check (singleton)
);

comment on table office_settings is
  'Entity 33. One row. Values are the office''s to change; adding a setting needs code, because code must read it.';

alter table office_settings enable row level security;

create trigger set_updated_at before update on office_settings
  for each row execute function set_updated_at();

-- The single row, at the source's named defaults. These are the office's numbers
-- to set -- they are defaults so the engines have something to run against, not
-- claims about what Greenwald actually wants.
insert into office_settings default values;
