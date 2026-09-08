-- Negative-test suite for 20260908010000_obligation_templates.sql.
--
-- Every test is EXPECTED TO FAIL. Each runs in its own SAVEPOINT and rolls back
-- regardless of outcome, so the script never leaves data behind -- run it any
-- time to confirm the schema still enforces its own rules.
-- Requires 9004_obligation_template_scenarios.sql to be applied.
--
-- Note on tests 05 and 06: the entity-scope rule is a DEFERRED constraint, so it
-- only fires at COMMIT. They force it early with SET CONSTRAINTS ... IMMEDIATE,
-- which is the only way to observe it inside a transaction that will be rolled back.

begin;

\echo '01 -- relation_type = after with no linked template: expect ERROR (obligation_templates_link_matches_relation)'
savepoint t;
insert into obligation_templates
  (code, name, authority_id, action_type, reporting_frequency_id,
   due_month_offset, due_day_of_month, relation_type, applies_to_all_entity_types)
values ('bad_after', 'בדיקה',
  (select id from authorities where code='vat'), 'payment',
  (select id from reporting_frequencies where name='חד-חודשי'),
  1, 15, 'after', true);
rollback to t;

\echo '02 -- relation_type = independent WITH a linked template: expect ERROR (same constraint, other direction)'
savepoint t;
insert into obligation_templates
  (code, name, authority_id, action_type, reporting_frequency_id,
   due_month_offset, due_day_of_month, relation_type, linked_template_id,
   applies_to_all_entity_types)
values ('bad_independent', 'בדיקה',
  (select id from authorities where code='vat'), 'payment',
  (select id from reporting_frequencies where name='חד-חודשי'),
  1, 15, 'independent',
  (select id from obligation_templates where code='vat_submission'), true);
rollback to t;

\echo '03 -- a template linked to itself: expect ERROR (obligation_templates_no_self_link)'
savepoint t;
update obligation_templates
set relation_type = 'after', linked_template_id = id
where code = 'income_tax_advances';
rollback to t;

\echo '04 -- two templates pointing at each other: expect ERROR (trg_obligation_templates_no_mutual_link)'
savepoint t;
update obligation_templates
set relation_type = 'after',
    linked_template_id = (select id from obligation_templates where code='vat_payment')
where code = 'vat_submission';
rollback to t;

\echo '05 -- applies_to_all = false with no entity-type rows: expect ERROR (deferred entity-scope trigger)'
savepoint t;
insert into obligation_templates
  (code, name, authority_id, action_type, reporting_frequency_id,
   due_month_offset, due_day_of_month, relation_type, applies_to_all_entity_types)
values ('bad_scope', 'בדיקה',
  (select id from authorities where code='vat'), 'submission',
  (select id from reporting_frequencies where name='חד-חודשי'),
  1, 15, 'independent', false);
set constraints trg_obligation_templates_entity_scope immediate;
rollback to t;

\echo '06 -- removing the LAST entity-type row from a restricted template: expect ERROR (deferred, from the junction side)'
savepoint t;
delete from obligation_template_entity_types
where obligation_template_id = (select id from obligation_templates where code='vat_submission');
set constraints trg_obligation_template_entity_types_scope immediate;
rollback to t;

\echo '07 -- due_day_of_month = 32: expect ERROR (check constraint)'
savepoint t;
insert into obligation_templates
  (code, name, authority_id, action_type, reporting_frequency_id,
   due_month_offset, due_day_of_month, relation_type, applies_to_all_entity_types)
values ('bad_day', 'בדיקה',
  (select id from authorities where code='vat'), 'submission',
  (select id from reporting_frequencies where name='חד-חודשי'),
  1, 32, 'independent', true);
rollback to t;

\echo '08 -- negative due_month_offset: expect ERROR (check constraint)'
savepoint t;
insert into obligation_templates
  (code, name, authority_id, action_type, reporting_frequency_id,
   due_month_offset, due_day_of_month, relation_type, applies_to_all_entity_types)
values ('bad_offset', 'בדיקה',
  (select id from authorities where code='vat'), 'submission',
  (select id from reporting_frequencies where name='חד-חודשי'),
  -1, 15, 'independent', true);
rollback to t;

\echo '09 -- obligation with no authority: expect ERROR (not null)'
savepoint t;
insert into obligation_templates
  (code, name, action_type, reporting_frequency_id,
   due_month_offset, due_day_of_month, relation_type, applies_to_all_entity_types)
values ('bad_no_authority', 'בדיקה', 'submission',
  (select id from reporting_frequencies where name='חד-חודשי'),
  1, 15, 'independent', true);
rollback to t;

\echo '10 -- applies_to_all_entity_types omitted entirely: expect ERROR (not null, no default -- an undecided state must not be saveable)'
savepoint t;
insert into obligation_templates
  (code, name, authority_id, action_type, reporting_frequency_id,
   due_month_offset, due_day_of_month, relation_type)
values ('bad_undecided', 'בדיקה',
  (select id from authorities where code='vat'), 'submission',
  (select id from reporting_frequencies where name='חד-חודשי'),
  1, 15, 'independent');
rollback to t;

\echo '11 -- action_type outside submission/payment: expect ERROR (check constraint)'
savepoint t;
insert into obligation_templates
  (code, name, authority_id, action_type, reporting_frequency_id,
   due_month_offset, due_day_of_month, relation_type, applies_to_all_entity_types)
values ('bad_action', 'בדיקה',
  (select id from authorities where code='vat'), 'reminder',
  (select id from reporting_frequencies where name='חד-חודשי'),
  1, 15, 'independent', true);
rollback to t;

\echo '12 -- deleting a service that a template hangs off: expect ERROR (restrict, not cascade)'
savepoint t;
delete from services where code = 'bookkeeping_company';
rollback to t;

\echo ''
\echo '--- positive checks ---'

\echo '13 -- the full chain: which obligations does each demo client actually owe?'
select c.legal_name, s.name as service, t.name as obligation, t.action_type,
       a.name as authority, t.due_month_offset as חודש_היסט, t.due_day_of_month as יום
from deal_services ds
join deals d                      on d.id = ds.deal_id and d.closed_at is null
join clients c                    on c.id = d.client_id
join services s                   on s.id = ds.service_id
join service_obligation_templates sot on sot.service_id = s.id
join obligation_templates t       on t.id = sot.obligation_template_id
join authorities a                on a.id = t.authority_id
where ds.is_active
  and (t.applies_to_all_entity_types
       or exists (select 1 from obligation_template_entity_types ote
                  where ote.obligation_template_id = t.id
                    and ote.entity_type_id = c.entity_type_id))
order by c.legal_name, a.name, t.name;

\echo '14 -- the entity-type filter in action: an exempt dealer must NOT be handed periodic VAT'
select count(*) as should_be_zero
from obligation_templates t
join obligation_template_entity_types ote on ote.obligation_template_id = t.id
join entity_types e on e.id = ote.entity_type_id
where t.code like 'vat%' and e.code = 'exempt_dealer';

\echo '15 -- linked pairs resolve, and only the dependent side holds the link'
select t.name as תבנית, t.relation_type, linked.name as מקושרת_אל
from obligation_templates t
left join obligation_templates linked on linked.id = t.linked_template_id
where t.relation_type in ('after', 'blocking_before')
order by t.code;

rollback;
