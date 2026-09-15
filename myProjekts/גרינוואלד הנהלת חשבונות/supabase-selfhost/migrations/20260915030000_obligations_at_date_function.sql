-- Migration: client_obligations_current becomes a function of a date.
--
-- The view was written this morning as "as of today", with a note that entity 10
-- would need "as of date X" and should reuse the logic rather than duplicate it.
-- This is that reuse, and it is not cosmetic: a generator producing obligations
-- six months out must ask what the client owed IN THAT PERIOD. A client whose
-- bookkeeping service ends in March must not be handed VAT obligations for June,
-- and "as of today" would hand them over without complaint.
--
-- The view keeps its name, its columns and its meaning -- it is now
-- client_obligations_at(current_date). Nothing that reads it changes.
--
-- security_invoker on the view is preserved. The function is STABLE and runs with
-- the caller's rights (no SECURITY DEFINER), so it cannot become a way around RLS
-- either -- the same concern decisions/0005 raises about views.
--
-- Source of truth: docs/entities/client_obligations_current.md

drop view client_obligations_current;

create or replace function client_obligations_at(p_date date)
returns table (
  client_id              uuid,
  client_name            text,
  obligation_template_id uuid,
  obligation_name        text,
  action_type            text,
  form_number            text,
  authority_name         text,
  reporting_frequency_id uuid,
  reporting_frequency    text,
  origin                 text,
  frequency_source       text,
  override_reason        text,
  due_month_offset       integer,
  due_day_of_month       integer
)
language sql stable as $fn$
with chain as (
  select distinct
    c.id  as client_id,
    ot.id as obligation_template_id
  from clients c
  join deals d
    on d.client_id = c.id
   and d.closed_at is null
  join deal_services ds
    on ds.deal_id = d.id
   and ds.started_at <= p_date
   and (ds.ended_at is null or ds.ended_at >= p_date)
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
  where pf.start_date <= p_date
    and (pt.end_date is null or pt.end_date >= p_date)
),
combined as (
  select
    coalesce(ch.client_id, ov.client_id)                           as client_id,
    coalesce(ch.obligation_template_id, ov.obligation_template_id) as obligation_template_id,
    (ch.client_id is not null)                                     as from_chain,
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
  c.legal_name,
  cb.obligation_template_id,
  ot.name,
  ot.action_type,
  ot.form_number,
  a.name,
  coalesce(ov_self.override_frequency_id,
           ov_anchor.override_frequency_id,
           ot.reporting_frequency_id),
  coalesce(rf_self.name, rf_anchor.name, rf_default.name),
  case
    when not cb.from_chain                           then 'override_include'
    when ov_self.override_frequency_id is not null   then 'override_frequency'
    when ov_anchor.override_frequency_id is not null then 'inherited_from_anchor'
    else 'chain'
  end,
  cb.frequency_source,
  cb.reason,
  ot.due_month_offset,
  ot.due_day_of_month
from combined cb
join clients c               on c.id = cb.client_id
join obligation_templates ot on ot.id = cb.obligation_template_id
join authorities a           on a.id = ot.authority_id
left join ovr ov_self
       on ov_self.client_id = cb.client_id
      and ov_self.obligation_template_id = cb.obligation_template_id
left join ovr ov_anchor
       on ov_anchor.client_id = cb.client_id
      and ov_anchor.obligation_template_id = ot.linked_template_id
left join reporting_frequencies rf_self    on rf_self.id    = ov_self.override_frequency_id
left join reporting_frequencies rf_anchor  on rf_anchor.id  = ov_anchor.override_frequency_id
left join reporting_frequencies rf_default on rf_default.id = ot.reporting_frequency_id
where coalesce(cb.applies, true)
$fn$;

comment on function client_obligations_at(date) is
  'What each client owed on a given date, chain resolved against entity 11. The view is this at current_date.';

create view client_obligations_current with (security_invoker = true) as
  select * from client_obligations_at(current_date);

comment on view client_obligations_current is
  'What each client owes today. Thin wrapper over client_obligations_at(current_date).';
