-- Migration: turnover history and thresholds stop carrying a year integer and
-- point at periods instead.
--
-- Decided in principle on 08/09 and recorded then: periods was built as the shared
-- binder every periodic entity points at, and then two tables expressed a period as
-- a bare number -- the exact duplication removed everywhere else in this project.
-- Yitzhak spotted it.
--
-- The second reason is not consistency but correctness: a tax year is not always a
-- calendar year. "year = 2024" cannot express July 2024 through June 2025. A period
-- can, because it carries start_date and end_date.
--
-- CONSCIOUS ADDITION BEYOND WHAT WAS APPROVED: a trigger enforcing that the period
-- is an ANNUAL one. Today these columns are guarded by CHECK (year between 1990 and
-- 2100). A bare FK to periods is a *weaker* guarantee -- it would happily let an
-- annual turnover row point at "January 2026". Without the trigger this migration
-- would remove an existing safeguard rather than preserve it.
--
-- The trigger tests months_interval = 12 rather than the label 'שנתי', so renaming
-- the frequency for display cannot silently break it. This also leaves non-calendar
-- fiscal years working: July-June is a legitimate annual period.
--
-- Source of truth: docs/entities/client_turnover_history.md,
--                  docs/entities/entity_type_thresholds.md

-- ── shared guard ──
create or replace function enforce_annual_period() returns trigger
language plpgsql as $$
begin
  if not exists (
    select 1
    from periods p
    join reporting_frequencies rf on rf.id = p.reporting_frequency_id
    where p.id = new.period_id
      and rf.months_interval = 12
  ) then
    raise exception 'period % is not an annual period (months_interval must be 12)', new.period_id;
  end if;
  return new;
end $$;

-- ── client_turnover_history ──
alter table client_turnover_history add column period_id uuid;

update client_turnover_history h
set period_id = p.id
from periods p
join reporting_frequencies rf on rf.id = p.reporting_frequency_id
where rf.months_interval = 12
  and extract(year from p.start_date)::int = h.year
  and extract(year from p.end_date)::int   = h.year;

-- Refuse to continue rather than quietly drop a year we could not map.
do $$
begin
  if exists (select 1 from client_turnover_history where period_id is null) then
    raise exception 'client_turnover_history: % row(s) have no matching annual period -- seed the range first',
      (select count(*) from client_turnover_history where period_id is null);
  end if;
end $$;

alter table client_turnover_history
  alter column period_id set not null,
  add foreign key (period_id) references periods(id) on delete restrict;

alter table client_turnover_history
  drop constraint client_turnover_history_client_id_year_key,
  drop constraint client_turnover_history_year_range,
  drop column year;

alter table client_turnover_history
  add constraint client_turnover_history_client_id_period_key unique (client_id, period_id);

create trigger trg_client_turnover_history_annual_period
  before insert or update of period_id on client_turnover_history
  for each row execute function enforce_annual_period();

create index idx_client_turnover_history_period on client_turnover_history (period_id);

-- ── entity_type_thresholds (empty table, so no backfill) ──
alter table entity_type_thresholds add column period_id uuid;

alter table entity_type_thresholds
  alter column period_id set not null,
  add foreign key (period_id) references periods(id) on delete restrict;

alter table entity_type_thresholds
  drop constraint entity_type_thresholds_one_per_kind_per_year,
  drop constraint entity_type_thresholds_year_check,
  drop column year;

alter table entity_type_thresholds
  add constraint entity_type_thresholds_one_per_kind_per_period
    unique (entity_type_id, threshold_kind, period_id);

create trigger trg_entity_type_thresholds_annual_period
  before insert or update of period_id on entity_type_thresholds
  for each row execute function enforce_annual_period();

create index idx_entity_type_thresholds_period on entity_type_thresholds (period_id);
