-- Migration: client_obligations_current -- the view that actually resolves the chain.
--
-- Entity 11 was built yesterday and nothing read it. The whole design rests on
-- "the full list is derived, never stored", and there was no derivation: the table
-- held one row and no query consulted it. This is the missing half.
--
-- It answers, for every client, the question the office actually asks:
-- what does THIS client owe, and at what cadence, as of today.
--
-- Four things decide a row:
--   1. the chain -- deal -> services in force -> templates -> entity-type filter
--   2. an exclude override removes a template the chain produced
--   3. an include override adds one the chain never would
--   4. a frequency override replaces the template's own cadence, and a dependent
--      template inherits its anchor's override rather than carrying its own
--
-- As-of-today, matching deal_services_current. Generating obligations for a past
-- or future period is entity 10's job and needs an as-of-date; that will reuse
-- this logic rather than duplicate it, which is why every rule here is expressed
-- against a single date rather than scattered.
--
-- security_invoker = true, per decisions/0005 -- a view without it is a door
-- around RLS. The column list is frozen at creation: adding a column to any base
-- table means create or replace view.
--
-- Source of truth: docs/entities/client_obligations_current.md

create view client_obligations_current with (security_invoker = true) as
with chain as (
  -- What the catalogue produces: services in force today, their templates, and
  -- the regulatory safety net that stops an exempt dealer receiving periodic VAT.
  select distinct
    c.id  as client_id,
    ot.id as obligation_template_id
  from clients c
  join deals d
    on d.client_id = c.id
   and d.closed_at is null
  join deal_services ds
    on ds.deal_id = d.id
   and ds.started_at <= current_date
   and (ds.ended_at is null or ds.ended_at >= current_date)
  join service_obligation_templates sot
    on sot.service_id = ds.service_id
  join obligation_templates ot
    on ot.id = sot.obligation_template_id
   and ot.is_active
  where c.deleted_at is null
    and (ot.applies_to_all_entity_types
         or exists (select 1
                      from obligation_template_entity_types x
                     where x.obligation_template_id = ot.id
                       and x.entity_type_id = c.entity_type_id))
),
ovr as (
  -- Overrides in force today. Scope is expressed in periods, so the date range
  -- comes from the periods they point at; an empty valid_to means still in force.
  select
    o.client_id,
    o.obligation_template_id,
    o.applies,
    o.override_frequency_id,
    o.frequency_source,
    o.reason
  from client_obligation_overrides o
  join periods pf on pf.id = o.valid_from_period_id
  left join periods pt on pt.id = o.valid_to_period_id
  where pf.start_date <= current_date
    and (pt.end_date is null or pt.end_date >= current_date)
),
combined as (
  -- FULL OUTER so an include override -- a template the chain never produces --
  -- still yields a row.
  select
    coalesce(ch.client_id, ov.client_id)                         as client_id,
    coalesce(ch.obligation_template_id, ov.obligation_template_id) as obligation_template_id,
    (ch.client_id is not null)                                   as from_chain,
    ov.applies,
    ov.override_frequency_id,
    ov.frequency_source,
    ov.reason
  from chain ch
  full outer join ovr ov
    on ov.client_id = ch.client_id
   and ov.obligation_template_id = ch.obligation_template_id
)
select
  cb.client_id,
  c.legal_name                                                   as client_name,
  cb.obligation_template_id,
  ot.name                                                        as obligation_name,
  ot.action_type,
  ot.form_number,
  a.name                                                         as authority_name,

  -- Effective cadence. Own override first, then the anchor's -- a dependent
  -- template follows the one it is linked to, which is why an override on a
  -- dependent is blocked at write time.
  coalesce(ov_self.override_frequency_id,
           ov_anchor.override_frequency_id,
           ot.reporting_frequency_id)                            as reporting_frequency_id,
  coalesce(rf_self.name, rf_anchor.name, rf_default.name)        as reporting_frequency,

  -- Why this row looks the way it does. Reading a resolved list without this
  -- forces whoever reads it to re-derive the reasoning by hand.
  case
    when not cb.from_chain                          then 'override_include'
    when ov_self.override_frequency_id is not null  then 'override_frequency'
    when ov_anchor.override_frequency_id is not null then 'inherited_from_anchor'
    else 'chain'
  end                                                            as origin,

  cb.frequency_source,
  cb.reason                                                      as override_reason,
  ot.due_month_offset,
  ot.due_day_of_month
from combined cb
join clients c              on c.id = cb.client_id
join obligation_templates ot on ot.id = cb.obligation_template_id
join authorities a          on a.id = ot.authority_id
left join ovr ov_self
       on ov_self.client_id = cb.client_id
      and ov_self.obligation_template_id = cb.obligation_template_id
left join ovr ov_anchor
       on ov_anchor.client_id = cb.client_id
      and ov_anchor.obligation_template_id = ot.linked_template_id
left join reporting_frequencies rf_self    on rf_self.id    = ov_self.override_frequency_id
left join reporting_frequencies rf_anchor  on rf_anchor.id  = ov_anchor.override_frequency_id
left join reporting_frequencies rf_default on rf_default.id = ot.reporting_frequency_id
-- An exclude removes the row. No override at all means the chain stands, which is
-- why the coalesce defaults to true rather than to false.
where coalesce(cb.applies, true);

comment on view client_obligations_current is
  'What each client owes today, chain resolved against entity 11. Derived, never stored.';
