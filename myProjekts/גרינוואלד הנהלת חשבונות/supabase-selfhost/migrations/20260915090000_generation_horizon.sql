-- Migration: the generation horizon becomes a declared setting.
--
-- Three generators exist -- calendar, obligations, reminders -- and how far ahead
-- each should reach was a number I typed into a call. The calendar reaches 2027,
-- obligations and reminders only 2026, and nothing anywhere says what the horizon
-- ought to be.
--
-- Yitzhak's correction was right: RUNNING the generators is the automation layer's
-- job, not this one's. But two things do belong here.
--
-- First, the automation needs a declared target instead of inventing one. Per
-- ADR 0009 the number of months ahead is a value the office owns, and
-- office_settings is exactly the table that holds such values.
--
-- Second, an automation that silently stops is indistinguishable from one that has
-- nothing to do. The generator runs; a CHECK shouts when it did not. Those are
-- different jobs, and the shouting belongs to verify.sh -- see the two checks added
-- there alongside this.
--
-- Source of truth: docs/entities/office_settings.md

alter table office_settings
  add column generation_horizon_months integer not null default 12
  check (generation_horizon_months between 1 and 60);

comment on column office_settings.generation_horizon_months is
  'How many months ahead the calendar, obligations and reminders must always cover.';

-- Bring every layer up to the declared horizon, so the setting and the data agree
-- from the moment it exists rather than from the automation's first run.
select generate_regulatory_calendar(
         current_date,
         (current_date + ((select generation_horizon_months from office_settings) || ' months')::interval)::date);

select generate_obligations(
         current_date,
         (current_date + ((select generation_horizon_months from office_settings) || ' months')::interval)::date);

select generate_reminders(
         current_date,
         (current_date + ((select generation_horizon_months from office_settings) || ' months')::interval)::date);
