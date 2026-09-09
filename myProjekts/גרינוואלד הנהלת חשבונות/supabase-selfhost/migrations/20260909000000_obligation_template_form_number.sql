-- Migration: form number on obligation templates.
--
-- Israeli filings are known by their form number -- 102, 126, 856 -- and that is
-- how the team actually talks about them ("who has not filed 102 this month").
-- Any future integration with the tax authority portals will need them too.
--
-- Nullable on purpose: a payment obligation has no form.
-- Source of truth: docs/entities/obligation_templates.md

alter table obligation_templates add column form_number text;
