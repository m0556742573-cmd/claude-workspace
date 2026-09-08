-- Migration: the exempt-dealer turnover ceiling becomes a per-year table.
--
-- Found while preparing to fill entity_types.turnover_threshold: the column held
-- ONE value with no year, but the ceiling is set annually and client_turnover_history
-- records turnover per year. Asking "did this client cross the ceiling in 2024?"
-- would have compared 2024 turnover against TODAY's ceiling -- wrong for every
-- historical year, and that comparison is exactly what goal 8 rests on
-- ("a dealer who crossed the threshold and should incorporate").
--
-- Yitzhak's decision (08/09/2026): per-year table.
-- Source of truth: docs/entities/entity_type_thresholds.md
--
-- The old column is dropped rather than left in place: two sources for one fact
-- is the thing this project has been removing everywhere else. It was never
-- populated (verified: 0 rows non-null, no dependent views), so nothing is lost.

create table entity_type_thresholds (
  id uuid primary key default gen_random_uuid(),
  entity_type_id uuid not null references entity_types(id) on delete restrict,
  year integer not null check (year between 1990 and 2100),
  turnover_threshold numeric(12,2) not null check (turnover_threshold >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entity_type_thresholds_one_per_year unique (entity_type_id, year)
);
alter table entity_type_thresholds enable row level security;
create trigger trg_entity_type_thresholds_updated_at before update on entity_type_thresholds
  for each row execute function set_updated_at();
create index idx_entity_type_thresholds_entity_type on entity_type_thresholds(entity_type_id);

alter table entity_types drop column turnover_threshold;
