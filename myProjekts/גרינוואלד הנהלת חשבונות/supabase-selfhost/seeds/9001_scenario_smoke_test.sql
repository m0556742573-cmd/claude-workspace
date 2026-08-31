-- Scenario smoke test: five clients that exercise the schema end to end.
--
-- NOT reference data and NOT real clients. This proves the model holds together;
-- it does not replace loading the firm's actual book, which is what will surface
-- real-world surprises (actual id formats, fields nobody filled in, duplicates).
--
-- Run inside a transaction and ROLLBACK unless you deliberately want the rows:
--   begin; \i 9001_scenario_smoke_test.sql  rollback;
--
-- Requires 0001_lookups.sql to have been applied.

-- ══════════════════════════════════════════════════════════
-- Office staff — exercises contacts↔office_employees 1:1, specializations, absences
-- ══════════════════════════════════════════════════════════

insert into contacts (first_name, last_name, id_number) values
  ('רבקה', 'גרינוואלד', '011111111'),
  ('מיכל',  'לוי',       '022222222');

insert into office_employees (contact_id, role_id, employment_type, employment_percentage, weekly_capacity_hours, hourly_cost, hire_date)
select c.id, r.id, 'employee', 100, 42, 180.00, '2019-03-01'
from contacts c, employee_roles r where c.id_number = '011111111' and r.code = 'owner';

insert into office_employees (contact_id, role_id, employment_type, employment_percentage, weekly_capacity_hours, hourly_cost, hire_date)
select c.id, r.id, 'employee', 80, 34, 95.00, '2023-09-15'
from contacts c, employee_roles r where c.id_number = '022222222' and r.code = 'bookkeeper';

insert into employee_specializations (employee_id, specialization_id)
select e.id, s.id from office_employees e join contacts c on c.id = e.contact_id, specializations s
where c.id_number = '022222222' and s.code in ('bookkeeping', 'payroll');

insert into employee_absences (employee_id, start_date, end_date, absence_type_id, covering_employee_id)
select e.id, '2026-09-06', '2026-09-24', t.id,
       (select e2.id from office_employees e2 join contacts c2 on c2.id = e2.contact_id where c2.id_number = '011111111')
from office_employees e join contacts c on c.id = e.contact_id, absence_types t
where c.id_number = '022222222' and t.code = 'reserve';

-- ══════════════════════════════════════════════════════════
-- 1 — עוסק מורשה: one person, personal mobile IS the business phone.
--     This is the case that motivated unifying the channel tables.
-- ══════════════════════════════════════════════════════════

insert into contacts (first_name, last_name, id_number) values ('אבי', 'מזרחי', '033333333');

insert into clients (entity_type_id, legal_name, trade_name, legal_id_number, status_id, vat_reporting_frequency_id, responsible_employee_id)
select t.id, 'אבי מזרחי', 'מזרחי שיפוצים', '033333333', s.id, f.id,
       (select e.id from office_employees e join contacts c on c.id = e.contact_id where c.id_number = '022222222')
from entity_types t, client_statuses s, reporting_frequencies f
where t.code = 'licensed_dealer' and s.code = 'active' and f.name = 'חד-חודשי';

insert into client_contacts (client_id, contact_id, role_id, position_at_business, responsible_since)
select cl.id, co.id, r.id, 'בעלים', '2021-01-01'
from clients cl, contacts co, client_contact_roles r
where cl.legal_id_number = '033333333' and co.id_number = '033333333' and r.code in ('signatory', 'primary');

-- The phone belongs to the PERSON. The client reaches it through client_contacts.
insert into channels (contact_id, channel_type, value, label)
select id, 'phone', '0521234567', 'נייד אישי ועסקי' from contacts where id_number = '033333333';

insert into client_official_channels (client_id, channel_id, channel_type)
select cl.id, ch.id, 'phone' from clients cl, channels ch
where cl.legal_id_number = '033333333' and ch.value = '0521234567';

-- ══════════════════════════════════════════════════════════
-- 2 — one owner, two companies, ONE shared phone line.
--     Verifies the claim that a single channel row can be official for several
--     clients — the case that a boolean column on channels could not express.
-- ══════════════════════════════════════════════════════════

insert into contacts (first_name, last_name, id_number) values ('שרה', 'ברקוביץ', '044444444');

insert into clients (entity_type_id, legal_name, legal_id_number, status_id, vat_reporting_frequency_id)
select t.id, v.nm, v.lid, s.id, f.id
from entity_types t, client_statuses s, reporting_frequencies f,
     (values ('ברקוביץ נכסים בע"מ', '514000001'), ('ברקוביץ אחזקות בע"מ', '514000002')) as v(nm, lid)
where t.code = 'company' and s.code = 'active' and f.name = 'דו-חודשי';

insert into client_contacts (client_id, contact_id, role_id, position_at_business, responsible_since)
select cl.id, co.id, r.id, 'מנכ"לית ובעלים', '2018-06-01'
from clients cl, contacts co, client_contact_roles r
where cl.legal_id_number in ('514000001', '514000002') and co.id_number = '044444444' and r.code = 'primary';

insert into channels (contact_id, channel_type, value, label, description)
select id, 'phone', '0539876543', 'קו משרד משותף', 'משמש את שתי החברות — לא ניתן לשייך אוטומטית, נדרשת בחירה אנושית'
from contacts where id_number = '044444444';

-- The SAME channel row, official for BOTH clients.
insert into client_official_channels (client_id, channel_id, channel_type)
select cl.id, ch.id, 'phone' from clients cl, channels ch
where cl.legal_id_number in ('514000001', '514000002') and ch.value = '0539876543';

-- ══════════════════════════════════════════════════════════
-- 3 — full company: several contacts by role, an auditor who was replaced,
--     two bank accounts with different purposes, an expired credential.
-- ══════════════════════════════════════════════════════════

insert into contacts (first_name, last_name, id_number) values
  ('יוסף',  'רוזנברג', '055555555'),
  ('דוד',   'שפירא',   '066666666'),
  ('נחמה',  'אדלר',    '077777777');

insert into clients (entity_type_id, legal_name, trade_name, legal_id_number, status_id,
                     vat_reporting_frequency_id, annual_report_frequency_id,
                     income_tax_file_number, deductions_file_number, city, engagement_start_date)
select t.id, 'רוזנברג טכנולוגיות בע"מ', 'RozenTech', '514000003', s.id, f1.id, f2.id,
       '914000003', '934000003', 'בני ברק', '2020-02-01'
from entity_types t, client_statuses s, reporting_frequencies f1, reporting_frequencies f2
where t.code = 'company' and s.code = 'active'
  and f1.name = 'חד-חודשי' and f2.name = 'שנתי';

insert into client_contacts (client_id, contact_id, role_id, position_at_business, responsible_since)
select cl.id, co.id, r.id, 'מנכ"ל', '2020-02-01'
from clients cl, contacts co, client_contact_roles r
where cl.legal_id_number = '514000003' and co.id_number = '055555555' and r.code in ('signatory', 'primary');

-- Auditor history: one ended, one active. The partial unique index must allow both.
insert into client_contacts (client_id, contact_id, role_id, responsible_since, ended_at, is_active)
select cl.id, co.id, r.id, '2020-02-01', '2024-12-31', false
from clients cl, contacts co, client_contact_roles r
where cl.legal_id_number = '514000003' and co.id_number = '066666666' and r.code = 'auditor';

insert into client_contacts (client_id, contact_id, role_id, responsible_since)
select cl.id, co.id, r.id, '2025-01-01'
from clients cl, contacts co, client_contact_roles r
where cl.legal_id_number = '514000003' and co.id_number = '077777777' and r.code = 'auditor';

insert into client_contact_responsibilities (client_contact_id, responsibility_area_id)
select cc.id, ra.id from client_contacts cc join clients cl on cl.id = cc.client_id
  join contacts co on co.id = cc.contact_id, responsibility_areas ra
where cl.legal_id_number = '514000003' and co.id_number = '055555555' and ra.code in ('material', 'approvals')
on conflict do nothing;

insert into client_bank_accounts (client_id, bank_name, bank_code, branch_number, account_number, account_holder_name, purpose_id)
select cl.id, v.bank, v.bcode, v.branch, v.acct, 'רוזנברג טכנולוגיות בע"מ', p.id
from clients cl, bank_account_purposes p,
     (values ('בנק לאומי', '10', '800', '12345678', 'collection'),
             ('בנק הפועלים', '12', '512', '87654321', 'refunds')) as v(bank, bcode, branch, acct, purpose)
where cl.legal_id_number = '514000003' and p.code = v.purpose;

-- An already-expired credential: the field that did not exist before today.
insert into client_credentials (client_id, credential_type_id, system_name, username, identification_type, valid_until)
select cl.id, t.id, 'שע"מ — רשות המסים', 'rozentech', 'כרטיס חכם', '2026-07-31'
from clients cl, credential_types t
where cl.legal_id_number = '514000003' and t.code = 'professional';

insert into client_credentials (client_id, credential_type_id, system_name, username, identification_type, valid_until)
select cl.id, t.id, 'חשבשבת', 'rozen_admin', 'סיסמה', '2027-03-31'
from clients cl, credential_types t
where cl.legal_id_number = '514000003' and t.code = 'financial';

insert into client_turnover_history (client_id, year, actual_turnover, expected_turnover)
select cl.id, v.y, v.a, v.e from clients cl,
  (values (2024, 2450000.00, 2300000.00), (2025, 3120000.00, 2900000.00)) as v(y, a, e)
where cl.legal_id_number = '514000003';

-- ══════════════════════════════════════════════════════════
-- 4 — client in onboarding with no legal id yet.
--     Was impossible before today (legal_id_number was NOT NULL).
-- ══════════════════════════════════════════════════════════

insert into clients (entity_type_id, legal_name, status_id)
select t.id, 'עסק חדש בהקמה (טרם התקבל ח.פ.)', s.id
from entity_types t, client_statuses s
where t.code = 'exempt_dealer' and s.code = 'onboarding';

-- ══════════════════════════════════════════════════════════
-- 5 — departed client, history retained.
-- ══════════════════════════════════════════════════════════

insert into contacts (first_name, last_name, id_number) values ('חיים', 'פרידמן', '088888888');

insert into clients (entity_type_id, legal_name, legal_id_number, status_id, engagement_start_date, departure_reason)
select t.id, 'פרידמן ובניו שותפות', '557000004', s.id, '2017-04-01', 'עבר למשרד אחר בעקבות מעבר גיאוגרפי'
from entity_types t, client_statuses s
where t.code = 'partnership' and s.code = 'departed';

insert into client_contacts (client_id, contact_id, role_id, responsible_since, ended_at, is_active)
select cl.id, co.id, r.id, '2017-04-01', '2025-11-30', false
from clients cl, contacts co, client_contact_roles r
where cl.legal_id_number = '557000004' and co.id_number = '088888888' and r.code = 'primary';

insert into client_notes (client_id, content, valid_until)
select id, 'התיק נסגר מסודר. כל הדוחות עד 2025 הוגשו. מסמכים בארכיון פיזי, מדף 14.', null
from clients where legal_id_number = '557000004';
