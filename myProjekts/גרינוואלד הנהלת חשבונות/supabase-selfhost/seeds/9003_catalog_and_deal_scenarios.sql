-- Demo catalog + deal scenarios, exercising every rule added in
-- 20260901000000_catalog_and_deal_model.sql and 20260901010000 (tiered price fix).
--
-- NOT the firm's real service catalog or real pricing -- demo data, kept in the
-- dev DB per Yitzhak's decision of 31/08/2026 so it can be browsed in Studio.
-- Run 9002-style cleanup before loading real clients/services into this DB.
--
-- Builds on the six scenario clients from 9001_scenario_smoke_test.sql, which
-- must already exist. Six services cover all three supply_type values and all
-- four pricing_basis values at least once.
--
-- Uses INSERT ... VALUES (with scalar subqueries per row) rather than a chain of
-- SELECT ... UNION ALL ... : a bare `null` in one branch and a numeric literal in
-- another makes Postgres's UNION column-type resolution fail ("text and numeric
-- cannot be matched"), because a plain SELECT list has no target-table context to
-- resolve against. A VALUES list inside INSERT takes its column types from the
-- target table directly, sidestepping that entirely.

-- ══════════════════════════════════════════════════════════
-- Service catalog
-- ══════════════════════════════════════════════════════════

insert into services (code, name, description, service_category_id, supply_type,
                       pricing_basis, quantity_source, default_billing_frequency_id,
                       overage_rate, standard_hours)
values
  ('bookkeeping_company', 'הנהלת חשבונות לחברה', 'ניהול ספרים חודשי לפי מספר תנועות/מסמכים',
   (select id from service_categories where code='bookkeeping'),
   'obligation_driven', 'tiered', 'documents',
   (select id from billing_frequencies where code='monthly'), null, 6.0),

  ('payroll_run', 'הרצת שכר', 'הפקת תלושי שכר חודשית',
   (select id from service_categories where code='payroll'),
   'obligation_driven', 'per_unit', 'payslips',
   (select id from billing_frequencies where code='monthly'), null, 2.0),

  ('annual_report_company', 'דוח שנתי לחברה', 'הכנת והגשת הדוח השנתי לרשויות',
   (select id from service_categories where code='annual'),
   'obligation_driven', 'flat', null,
   (select id from billing_frequencies where code='annual'), null, 8.0),

  ('advisory_retainer', 'ריטיינר ייעוץ מס', 'זמינות חודשית עד למכסת שעות מוסכמת',
   (select id from service_categories where code='advisory'),
   'quota', 'flat', null,
   (select id from billing_frequencies where code='monthly'), 350.00, 10.0),

  ('advisory_hours', 'שעות ייעוץ כלליות', 'ייעוץ לפי דרישה, ללא מכסה',
   (select id from service_categories where code='advisory'),
   'on_demand', 'hourly', 'work_hours',
   (select id from billing_frequencies where code='per_occurrence'), null, null),

  ('company_formation', 'הקמת חברה', 'פתיחת תיק חברה ברשם החברות וברשויות המס',
   (select id from service_categories where code='formation'),
   'on_demand', 'flat', null,
   (select id from billing_frequencies where code='one_off'), null, 5.0)
on conflict (code) do nothing;

-- ══════════════════════════════════════════════════════════
-- Catalog price history (non-tiered services only -- tiered services price
-- exclusively through service_price_tiers, never through this table)
-- ══════════════════════════════════════════════════════════

insert into service_price_history (service_id, price, valid_from, valid_to, notes)
values
  ((select id from services where code='payroll_run'), 30.00, '2023-01-01', '2025-12-31', 'מחירון היסטורי'),
  ((select id from services where code='payroll_run'), 35.00, '2026-01-01', null, 'עדכון מחירון שנתי'),
  ((select id from services where code='annual_report_company'), 2200.00, '2023-01-01', '2024-12-31', 'מחירון היסטורי'),
  ((select id from services where code='annual_report_company'), 2500.00, '2025-01-01', null, 'עדכון מחירון שנתי'),
  ((select id from services where code='advisory_retainer'), 800.00, '2024-01-01', null, 'תעריף בסיס לריטיינר, לא כולל חריגה'),
  ((select id from services where code='advisory_hours'), 450.00, '2024-01-01', null, null),
  ((select id from services where code='company_formation'), 3500.00, '2023-01-01', null, null);

-- ══════════════════════════════════════════════════════════
-- Volume tiers for the one tiered service. Two full tier sets across time,
-- proving the EXCLUDE constraint keys on quantity AND date together: the
-- quantity ranges below repeat, but the date ranges never overlap.
-- ══════════════════════════════════════════════════════════

insert into service_price_tiers (service_id, from_quantity, to_quantity, price, valid_from, valid_to)
values
  ((select id from services where code='bookkeeping_company'), 0,   50,   550.00,  '2023-01-01', '2025-12-31'),
  ((select id from services where code='bookkeeping_company'), 51,  150,  850.00,  '2023-01-01', '2025-12-31'),
  ((select id from services where code='bookkeeping_company'), 151, null, 1300.00, '2023-01-01', '2025-12-31'),
  ((select id from services where code='bookkeeping_company'), 0,   50,   600.00,  '2026-01-01', null),
  ((select id from services where code='bookkeeping_company'), 51,  150,  900.00,  '2026-01-01', null),
  ((select id from services where code='bookkeeping_company'), 151, null, 1400.00, '2026-01-01', null);

-- ══════════════════════════════════════════════════════════
-- Deals. Five of the six scenario clients get one; the onboarding client
-- (no legal_id_number) deliberately gets none -- proving a client can exist
-- with no deal at all.
-- ══════════════════════════════════════════════════════════

insert into deals (client_id, opened_at, closed_at, closure_reason)
values
  ((select id from clients where legal_id_number = '033333333'), '2021-01-01', null, null),
  ((select id from clients where legal_id_number = '514000001'), '2018-06-01', null, null),
  ((select id from clients where legal_id_number = '514000002'), '2019-03-01', null, null),
  ((select id from clients where legal_id_number = '514000003'), '2020-02-01', null, null),
  ((select id from clients where legal_id_number = '557000004'), '2017-04-01', '2025-11-30',
   'עבר למשרד אחר בעקבות מעבר גיאוגרפי');

-- ── deal_services + deal_service_terms, deal by deal ──
-- Each deal_services row is immediately followed by its terms row, satisfying
-- the deferred "every line has terms" constraint within the same transaction.

-- אבי מזרחי - עוסק מורשה, שעות ייעוץ בלבד
with line as (
  insert into deal_services (deal_id, service_id, started_at)
  select d.id, s.id, '2021-01-01'
  from deals d join clients c on c.id = d.client_id, services s
  where c.legal_id_number = '033333333' and s.code = 'advisory_hours'
  returning id
)
insert into deal_service_terms (deal_service_id, agreed_price, valid_from, reason, created_by)
select line.id, 450.00, '2021-01-01', 'תנאי פתיחה',
       (select e.id from office_employees e join contacts co on co.id=e.contact_id where co.id_number='011111111')
from line;

-- ברקוביץ נכסים - הנה"ח (מדרגות, agreed_price ריק בכוונה) + הנחה ספציפית
with line as (
  insert into deal_services (deal_id, service_id, started_at)
  select d.id, s.id, '2018-06-01'
  from deals d join clients c on c.id = d.client_id, services s
  where c.legal_id_number = '514000001' and s.code = 'bookkeeping_company'
  returning id
)
insert into deal_service_terms (deal_service_id, agreed_price, valid_from, reason, created_by)
select line.id, null, '2018-06-01', 'תנאי פתיחה',
       (select e.id from office_employees e join contacts co on co.id=e.contact_id where co.id_number='011111111')
from line;

insert into discounts (deal_id, deal_service_id, kind, calculation, value, conflict_resolution,
                        valid_from, reason, created_by)
select d.id, ds.id, 'discount', 'fixed', 100.00, null, '2024-01-01', 'לקוח ותיק',
       (select e.id from office_employees e join contacts co on co.id=e.contact_id where co.id_number='011111111')
from deals d
join clients c on c.id = d.client_id
join deal_services ds on ds.deal_id = d.id
join services s on s.id = ds.service_id
where c.legal_id_number = '514000001' and s.code = 'bookkeeping_company';

-- ברקוביץ אחזקות - ריטיינר ייעוץ (מכסה + תעריף חריגה מוסכם, נמוך מהמחירון) + הנחה כללית
with line as (
  insert into deal_services (deal_id, service_id, started_at)
  select d.id, s.id, '2019-03-01'
  from deals d join clients c on c.id = d.client_id, services s
  where c.legal_id_number = '514000002' and s.code = 'advisory_retainer'
  returning id
)
insert into deal_service_terms (deal_service_id, agreed_price, agreed_overage_rate, quota_amount,
                                 valid_from, reason, created_by)
select line.id, 800.00, 300.00, 10.00, '2019-03-01', 'תנאי פתיחה',
       (select e.id from office_employees e join contacts co on co.id=e.contact_id where co.id_number='011111111')
from line;

insert into discounts (deal_id, deal_service_id, kind, calculation, value, conflict_resolution,
                        valid_from, reason, created_by)
select d.id, null, 'discount', 'percent', 5.00, 'specific_wins', '2019-03-01', 'הנחת רצון טוב',
       (select e.id from office_employees e join contacts co on co.id=e.contact_id where co.id_number='011111111')
from deals d join clients c on c.id = d.client_id
where c.legal_id_number = '514000002';

-- רוזנברג טכנולוגיות - חבילה מלאה: הנה"ח (מדרגות) + שכר (עם היסטוריית מחיר) +
-- דוח שנתי, עם הנחה כללית והטבה ספציפית
with line as (
  insert into deal_services (deal_id, service_id, started_at)
  select d.id, s.id, '2020-02-01'
  from deals d join clients c on c.id = d.client_id, services s
  where c.legal_id_number = '514000003' and s.code = 'bookkeeping_company'
  returning id
)
insert into deal_service_terms (deal_service_id, agreed_price, valid_from, reason, created_by)
select line.id, null, '2020-02-01', 'תנאי פתיחה',
       (select e.id from office_employees e join contacts co on co.id=e.contact_id where co.id_number='011111111')
from line;

with line as (
  insert into deal_services (deal_id, service_id, started_at)
  select d.id, s.id, '2020-02-01'
  from deals d join clients c on c.id = d.client_id, services s
  where c.legal_id_number = '514000003' and s.code = 'payroll_run'
  returning id
)
insert into deal_service_terms (deal_service_id, agreed_price, valid_from, valid_to, reason, created_by)
select line.id, 32.00, '2020-02-01', '2023-12-31', 'תנאי פתיחה',
       (select e.id from office_employees e join contacts co on co.id=e.contact_id where co.id_number='011111111')
from line;

-- second, current term for the same line -- proves history + EXCLUDE together
insert into deal_service_terms (deal_service_id, agreed_price, valid_from, reason, created_by)
select ds.id, 35.00, '2024-01-01', 'עדכון להתאמה למחירון',
       (select e.id from office_employees e join contacts co on co.id=e.contact_id where co.id_number='022222222')
from deal_services ds
join deals d on d.id = ds.deal_id join clients c on c.id = d.client_id
join services s on s.id = ds.service_id
where c.legal_id_number = '514000003' and s.code = 'payroll_run';

with line as (
  insert into deal_services (deal_id, service_id, started_at)
  select d.id, s.id, '2020-02-01'
  from deals d join clients c on c.id = d.client_id, services s
  where c.legal_id_number = '514000003' and s.code = 'annual_report_company'
  returning id
)
insert into deal_service_terms (deal_service_id, agreed_price, valid_from, reason, created_by)
select line.id, 2500.00, '2020-02-01', 'תנאי פתיחה',
       (select e.id from office_employees e join contacts co on co.id=e.contact_id where co.id_number='011111111')
from line;

insert into discounts (deal_id, deal_service_id, kind, calculation, value, conflict_resolution,
                        valid_from, reason, created_by)
select d.id, null, 'discount', 'percent', 10.00, 'specific_wins',
       '2025-01-01', 'לקוח ותיק, מעל 5 שנות התקשרות',
       (select e.id from office_employees e join contacts co on co.id=e.contact_id where co.id_number='011111111')
from deals d join clients c on c.id = d.client_id
where c.legal_id_number = '514000003';

insert into discounts (deal_id, deal_service_id, kind, calculation, value, conflict_resolution,
                        valid_from, valid_to, reason, created_by)
select d.id, ds.id, 'benefit', 'percent', 100.00, null,
       '2025-01-01', '2025-12-31', 'בדיקת דוח שנתי במתנה לרגל 5 שנות התקשרות',
       (select e.id from office_employees e join contacts co on co.id=e.contact_id where co.id_number='011111111')
from deals d
join clients c on c.id = d.client_id
join deal_services ds on ds.deal_id = d.id
join services s on s.id = ds.service_id
where c.legal_id_number = '514000003' and s.code = 'annual_report_company';

-- פרידמן ובניו - עזב, החשבון והשורה סגורים יחד. מוכיח: restrict מגן על היסטוריה
-- סגורה, וה-VIEW deal_services_current לא יציג את השורה הזו.
with line as (
  insert into deal_services (deal_id, service_id, started_at, ended_at, is_active)
  select d.id, s.id, '2017-04-01', '2025-11-30', false
  from deals d join clients c on c.id = d.client_id, services s
  where c.legal_id_number = '557000004' and s.code = 'bookkeeping_company'
  returning id
)
insert into deal_service_terms (deal_service_id, agreed_price, valid_from, valid_to, reason, created_by)
select line.id, null, '2017-04-01', '2025-11-30', 'תנאי פתיחה',
       (select e.id from office_employees e join contacts co on co.id=e.contact_id where co.id_number='011111111')
from line;
