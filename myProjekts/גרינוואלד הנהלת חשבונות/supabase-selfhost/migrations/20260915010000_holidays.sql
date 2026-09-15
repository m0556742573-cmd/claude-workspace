-- Migration: holidays -- the days a deadline cannot fall on.
--
-- NOT one of the 33 entities. It surfaced while reading the source for entity 30,
-- which requires "a holiday table filled manually once a year or by automation"
-- in order to compute the Shabbat/holiday correction that covers 90% of due-date
-- shifts. Nothing in the model provided one.
--
-- TWO LAYERS, and the reason is the whole design:
--
--   Hebcal knows halacha. It does not know administration.
--
-- yomtov = true means work is forbidden. The question this system actually asks is
-- "does the tax authority treat this day as a non-working day for the purpose of a
-- filing deadline", which is a different question. They mostly coincide and
-- sometimes do not: erev chag is usually a half working day, chol hamoed is
-- officially working, fasts are working days, Yom HaZikaron is a working day while
-- Yom HaAtzmaut is not -- and the authority sometimes defers a deadline for reasons
-- that are not holidays at all.
--
-- So: the import fills the raw calendar, a person owns is_non_working.
--
-- THE RULE THAT MUST HOLD: an import never overwrites a human decision. If somebody
-- marked erev Pesach as non-working, re-running the import must not reset it. This
-- is the same machine as frequency_source in entity 11 -- a field that decides
-- whether the system may change a value on its own -- and it is the second time
-- that shape has appeared, which is why source is a column and not a comment.
--
-- SHABBAT IS NOT IN THIS TABLE. Every Saturday is non-working and that is pure
-- arithmetic, like periods: extract(dow) = 6. A table is for what cannot be
-- computed. Storing 52 rows a year of a fact a WHERE clause already knows would be
-- the same duplication removed everywhere else here.
--
-- Source of truth: docs/entities/holidays.md

create table holidays (
  id             uuid primary key default gen_random_uuid(),

  holiday_date   date not null,
  name           text not null,
  name_en        text,
  hebrew_date    text,

  -- Raw, as Hebcal returned it. Kept for traceability: when somebody asks in two
  -- years why a date is flagged the way it is, the answer is in the row.
  category       text,
  subcat         text,
  is_yomtov      boolean not null default false,

  -- The administrative decision. Defaults from is_yomtov on import, and a person
  -- may change it. This is the column the due-date calculator actually reads.
  is_non_working boolean not null,

  -- Who owns this row. 'hebcal' rows may be refreshed by the import; the other two
  -- are human-owned and the import must leave them alone.
  source         text not null
                 check (source in ('hebcal', 'manual', 'authority_notice')),

  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- Two holidays can share a date (Rosh Chodesh alongside another). The question
  -- "is this date non-working" is therefore an EXISTS over the date, not a lookup
  -- of one row -- if any row for that date says non-working, it is.
  constraint holidays_one_per_name_per_date unique (holiday_date, name)
);

comment on table holidays is
  'Days a filing deadline cannot fall on. Hebcal fills the calendar; a person owns is_non_working.';

alter table holidays enable row level security;

create trigger set_updated_at before update on holidays
  for each row execute function set_updated_at();

create index idx_holidays_date on holidays (holiday_date);
create index idx_holidays_non_working on holidays (holiday_date) where is_non_working;
