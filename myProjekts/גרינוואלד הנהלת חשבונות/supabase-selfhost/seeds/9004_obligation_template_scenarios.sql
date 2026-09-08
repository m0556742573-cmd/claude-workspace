-- Demo obligation templates, exercising every rule in 20260908010000.
--
-- NOT the firm's real obligation set -- demo data. The real templates, and which
-- service pulls which, are the office's to enter: the schema supports any
-- packaging, and nothing here is hardcoded into it.
--
-- Eight templates chosen so all four relation_type values appear at least once,
-- with the real examples the spec named for each. Requires 9003 (services).

-- ══════════════════════════════════════════════════════════
-- Authorities -- how the work is actually grouped day to day
-- ══════════════════════════════════════════════════════════

insert into authorities (code, name, website) values
  ('vat',               'מע"מ (רשות המסים)',      'https://www.gov.il/he/departments/israel_tax_authority'),
  ('income_tax',        'מס הכנסה (רשות המסים)',  'https://www.gov.il/he/departments/israel_tax_authority'),
  ('national_insurance','ביטוח לאומי',            'https://www.btl.gov.il'),
  ('pension',           'קרנות פנסיה וגמל',       null)
on conflict (code) do nothing;

-- ══════════════════════════════════════════════════════════
-- Templates. Insert order matters only for the linked pairs: the anchor first,
-- then the dependent half that points at it.
-- ══════════════════════════════════════════════════════════

-- independent -- a payment with no submission of its own
insert into obligation_templates
  (code, name, authority_id, action_type, reporting_frequency_id,
   due_month_offset, due_day_of_month, relation_type, requires_payroll_run,
   applies_to_all_entity_types, allows_amendments)
values
  ('income_tax_advances', 'מקדמות מס הכנסה',
   (select id from authorities where code='income_tax'), 'payment',
   (select id from reporting_frequencies where name='חד-חודשי'),
   1, 15, 'independent', false, true, false),

-- embedded -- the submission carries the payment; no separate payment instance
  ('withholding_submission', 'דיווח ניכויים (מס הכנסה על שכר)',
   (select id from authorities where code='income_tax'), 'submission',
   (select id from reporting_frequencies where name='חד-חודשי'),
   1, 16, 'embedded', true, true, true),

  ('annual_report_submission', 'הגשת דוח שנתי',
   (select id from authorities where code='income_tax'), 'submission',
   (select id from reporting_frequencies where name='שנתי'),
   5, 31, 'independent', false, true, true),

-- the two anchors that dependent templates will point at
  ('vat_submission', 'הגשת דיווח מע"מ',
   (select id from authorities where code='vat'), 'submission',
   (select id from reporting_frequencies where name='דו-חודשי'),
   1, 15, 'independent', false, false, true),

  ('pension_payment', 'תשלום הפרשות פנסיה',
   (select id from authorities where code='pension'), 'payment',
   (select id from reporting_frequencies where name='חד-חודשי'),
   1, 7, 'independent', true, true, false);

-- after -- the VAT payment follows the VAT submission
insert into obligation_templates
  (code, name, authority_id, action_type, reporting_frequency_id,
   due_month_offset, due_day_of_month, relation_type, linked_template_id,
   requires_payroll_run, applies_to_all_entity_types, allows_amendments)
values
  ('vat_payment', 'תשלום מע"מ',
   (select id from authorities where code='vat'), 'payment',
   (select id from reporting_frequencies where name='דו-חודשי'),
   1, 15, 'after',
   (select id from obligation_templates where code='vat_submission'),
   false, false, false),

-- blocking_before -- the pension filing cannot go out before the money is paid
  ('pension_submission', 'הגשת דיווח פנסיה',
   (select id from authorities where code='pension'), 'submission',
   (select id from reporting_frequencies where name='חד-חודשי'),
   1, 15, 'blocking_before',
   (select id from obligation_templates where code='pension_payment'),
   true, true, false);

-- ══════════════════════════════════════════════════════════
-- Entity-type scope. Only the two VAT templates are restricted: an exempt dealer
-- files an annual declaration, not a periodic VAT return, so handing one a
-- bi-monthly VAT obligation would send the team chasing something that does not
-- exist. Every other template above is marked applies_to_all_entity_types = true
-- and therefore needs no rows here at all.
-- ══════════════════════════════════════════════════════════

insert into obligation_template_entity_types (obligation_template_id, entity_type_id)
select t.id, e.id
from obligation_templates t, entity_types e
where t.code in ('vat_submission', 'vat_payment')
  and e.code in ('licensed_dealer', 'company', 'partnership');

-- ══════════════════════════════════════════════════════════
-- What each service pulls. THIS is the table that makes the catalog a recipe --
-- and its contents are a business decision, not a structural one: the office can
-- sell VAT filing inside bookkeeping (as below) or as its own service, and the
-- schema is indifferent.
-- ══════════════════════════════════════════════════════════

insert into service_obligation_templates (service_id, obligation_template_id)
select s.id, t.id
from services s, obligation_templates t
where (s.code = 'bookkeeping_company'
        and t.code in ('vat_submission', 'vat_payment', 'income_tax_advances'))
   or (s.code = 'payroll_run'
        and t.code in ('withholding_submission', 'pension_payment', 'pension_submission'))
   or (s.code = 'annual_report_company'
        and t.code in ('annual_report_submission'));
