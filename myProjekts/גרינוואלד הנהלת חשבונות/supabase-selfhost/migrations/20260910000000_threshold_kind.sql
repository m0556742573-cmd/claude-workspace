-- Migration: entity_type_thresholds gains a threshold kind.
--
-- The table was built for one regulatory number -- the exempt-dealer ceiling.
-- Yitzhak's answer about VAT frequency surfaced a second one: a licensed dealer
-- turning over more than 1,500,000 must report monthly rather than bi-monthly.
-- Same shape (entity type, year, amount), different meaning, and each drives a
-- different alert -- one says "you should incorporate", the other says "you are
-- filing at the wrong frequency and are exposed to a penalty".
--
-- CHECK and not a lookup, per decisions/0006: each value is a different machine
-- in code, so a third kind needs code rather than a row.
--
-- turnover_threshold becomes amount: "turnover_threshold" reads oddly once the
-- table holds several kinds of threshold, and the column already says what it is
-- through threshold_kind.
--
-- The table is empty, so none of this needs a data migration.
-- Source of truth: docs/entities/entity_type_thresholds.md

alter table entity_type_thresholds
  drop constraint entity_type_thresholds_one_per_year;

alter table entity_type_thresholds
  add column threshold_kind text not null
  check (threshold_kind in ('exempt_dealer_ceiling', 'monthly_vat_reporting'));

alter table entity_type_thresholds
  rename column turnover_threshold to amount;

alter table entity_type_thresholds
  add constraint entity_type_thresholds_one_per_kind_per_year
  unique (entity_type_id, threshold_kind, year);
