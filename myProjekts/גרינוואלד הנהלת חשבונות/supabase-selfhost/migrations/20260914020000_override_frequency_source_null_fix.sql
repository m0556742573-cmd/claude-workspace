-- Corrective migration: frequency_source could be left empty.
--
-- The constraint written in 20260914010000 was:
--
--   check ((override_frequency_id is null  and frequency_source is null)
--       or (override_frequency_id is not null
--           and frequency_source in ('turnover_derived','authority_demand','other')))
--
-- With a frequency set and frequency_source NULL, the second branch evaluates to
-- "true and NULL" = NULL, the first to false, and "false or NULL" = NULL. A CHECK
-- that evaluates to NULL PASSES -- SQL three-valued logic. So a row could carry an
-- override frequency with no source at all.
--
-- That is not cosmetic. frequency_source is what tells the system whether it may
-- change the value on its own: "turnover_derived" means it may raise an alert when
-- turnover moves, "authority_demand" means it must not touch the value even if
-- turnover falls. A row with no source is a row the system cannot reason about,
-- and the likeliest wrong guess is to treat silence as permission.
--
-- Caught by test N2 in scripts/test_client_obligation_override_constraints.sql.
-- It was already failing in the dry run; the interleaved psql output was misread
-- as a pass, which is the reason the battery reports each test on its own line now.
--
-- The replacement is two constraints rather than one, and both are NULL-safe
-- because "x is null" never returns NULL:
--   1. presence -- a frequency and a source travel together, or neither is there
--   2. value    -- if a source is present it must be one of the three
--
-- Source of truth: docs/entities/client_obligation_overrides.md

alter table client_obligation_overrides
  drop constraint frequency_source_matches_frequency;

alter table client_obligation_overrides
  add constraint frequency_source_present_with_frequency
    check ((override_frequency_id is null) = (frequency_source is null));

alter table client_obligation_overrides
  add constraint frequency_source_is_known
    check (frequency_source is null
           or frequency_source in ('turnover_derived', 'authority_demand', 'other'));
