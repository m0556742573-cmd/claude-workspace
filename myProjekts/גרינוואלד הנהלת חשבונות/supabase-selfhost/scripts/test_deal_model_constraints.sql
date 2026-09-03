-- Negative-test suite for 20260901000000_catalog_and_deal_model.sql and
-- 20260901010000_deal_terms_tiered_price_fix.sql.
--
-- Every test below is EXPECTED TO FAIL. Each runs inside its own SAVEPOINT and
-- rolls back to it regardless of outcome, so this script never leaves data
-- behind -- run it any time to confirm the schema still enforces its own rules
-- after a change. Requires 9001_scenario_smoke_test.sql and
-- 9003_catalog_and_deal_scenarios.sql to already be applied (uses their rows).
--
-- Run: cat this file | psql ... , or wrap in begin/rollback yourself. It ends
-- with a plain rollback so it is safe even if you forget to wrap it.

begin;

\echo '01 -- per_unit service with no quantity_source: expect ERROR (services_quantity_source_matches_basis)'
savepoint t;
insert into services (code, name, service_category_id, supply_type, pricing_basis, quantity_source)
select 'bad_per_unit', 'בדיקה', id, 'obligation_driven', 'per_unit', null
from service_categories where code = 'bookkeeping';
rollback to t;

\echo '02 -- overage_rate on a non-quota service: expect ERROR (services_overage_only_for_quota)'
savepoint t;
insert into services (code, name, service_category_id, supply_type, pricing_basis, overage_rate)
select 'bad_overage', 'בדיקה', id, 'on_demand', 'flat', 100.00
from service_categories where code = 'formation';
rollback to t;

\echo '03 -- overlapping catalog price history for payroll_run: expect ERROR (service_price_history_no_overlap)'
savepoint t;
insert into service_price_history (service_id, price, valid_from, valid_to)
select id, 40.00, '2026-06-01', null from services where code = 'payroll_run';
rollback to t;

\echo '04 -- overlapping price tier (same qty range, same dates) for bookkeeping_company: expect ERROR (service_price_tiers_no_overlap)'
savepoint t;
insert into service_price_tiers (service_id, from_quantity, to_quantity, price, valid_from, valid_to)
select id, 0, 50, 999.00, '2026-06-01', null from services where code = 'bookkeeping_company';
rollback to t;

\echo '05 -- second open deal for אבי מזרחי, who already has one: expect ERROR (idx_deals_one_open_per_client)'
savepoint t;
insert into deals (client_id, opened_at)
select id, '2026-06-01' from clients where legal_id_number = '033333333';
rollback to t;

\echo '06 -- second ACTIVE line for the same (deal, service): expect ERROR (idx_deal_services_one_active)'
savepoint t;
insert into deal_services (deal_id, service_id, started_at)
select d.id, s.id, '2026-06-01'
from deals d join clients c on c.id = d.client_id, services s
where c.legal_id_number = '033333333' and s.code = 'advisory_hours';
rollback to t;

\echo '07 -- a line with no terms row, checked immediately: expect ERROR (trg_deal_services_must_have_terms, deferred)'
savepoint t;
insert into deal_services (deal_id, service_id, started_at)
select d.id, s.id, '2026-06-01'
from deals d join clients c on c.id = d.client_id, services s
where c.legal_id_number = '514000003' and s.code = 'company_formation';
set constraints trg_deal_services_must_have_terms immediate;
rollback to t;

\echo '08 -- quota_amount set on a non-quota service line (אבי''s advisory_hours): expect ERROR (trg_deal_service_terms_quota_check)'
savepoint t;
insert into deal_service_terms (deal_service_id, agreed_price, quota_amount, valid_from)
select ds.id, 450.00, 5.00, '2026-06-01'
from deal_services ds join deals d on d.id = ds.deal_id join clients c on c.id = d.client_id
join services s on s.id = ds.service_id
where c.legal_id_number = '033333333' and s.code = 'advisory_hours';
rollback to t;

\echo '09 -- agreed_price set (not null) on the TIERED bookkeeping line: expect ERROR (trg_deal_service_terms_price_basis_check)'
savepoint t;
insert into deal_service_terms (deal_service_id, agreed_price, valid_from)
select ds.id, 900.00, '2026-06-01'
from deal_services ds join deals d on d.id = ds.deal_id join clients c on c.id = d.client_id
join services s on s.id = ds.service_id
where c.legal_id_number = '514000001' and s.code = 'bookkeeping_company';
rollback to t;

\echo '10 -- agreed_price NULL on a non-tiered line (אבי''s advisory_hours): expect ERROR (trg_deal_service_terms_price_basis_check)'
savepoint t;
insert into deal_service_terms (deal_service_id, agreed_price, valid_from)
select ds.id, null, '2026-06-01'
from deal_services ds join deals d on d.id = ds.deal_id join clients c on c.id = d.client_id
join services s on s.id = ds.service_id
where c.legal_id_number = '033333333' and s.code = 'advisory_hours';
rollback to t;

\echo '11 -- overlapping terms on רוזנברג''s payroll line (already has 2020-2023 and 2024-open): expect ERROR (deal_service_terms_no_overlap)'
savepoint t;
insert into deal_service_terms (deal_service_id, agreed_price, valid_from)
select ds.id, 40.00, '2025-01-01'
from deal_services ds join deals d on d.id = ds.deal_id join clients c on c.id = d.client_id
join services s on s.id = ds.service_id
where c.legal_id_number = '514000003' and s.code = 'payroll_run';
rollback to t;

\echo '12 -- discount value 150 with calculation=percent: expect ERROR (discounts_percent_max)'
savepoint t;
insert into discounts (deal_id, kind, calculation, value, conflict_resolution, valid_from)
select d.id, 'discount', 'percent', 150.00, 'specific_wins', '2026-06-01'
from deals d join clients c on c.id = d.client_id where c.legal_id_number = '033333333';
rollback to t;

\echo '13 -- specific discount (deal_service_id set) WITH conflict_resolution set: expect ERROR (discounts_conflict_only_for_general)'
savepoint t;
insert into discounts (deal_id, deal_service_id, kind, calculation, value, conflict_resolution, valid_from)
select d.id, ds.id, 'discount', 'fixed', 50.00, 'specific_wins', '2026-06-01'
from deal_services ds join deals d on d.id = ds.deal_id join clients c on c.id = d.client_id
where c.legal_id_number = '514000001';
rollback to t;

\echo '14 -- general discount (deal_service_id null) WITHOUT conflict_resolution: expect ERROR (discounts_conflict_only_for_general)'
savepoint t;
insert into discounts (deal_id, kind, calculation, value, valid_from)
select d.id, 'discount', 'percent', 5.00, '2026-06-01'
from deals d join clients c on c.id = d.client_id where c.legal_id_number = '033333333';
rollback to t;

\echo '15 -- second GENERAL discount overlapping רוזנברג''s existing one: expect ERROR (discounts_no_overlap_general)'
savepoint t;
insert into discounts (deal_id, kind, calculation, value, conflict_resolution, valid_from)
select d.id, 'discount', 'fixed', 200.00, 'general_wins', '2025-06-01'
from deals d join clients c on c.id = d.client_id where c.legal_id_number = '514000003';
rollback to t;

\echo '16 -- second SPECIFIC discount overlapping ברקוביץ נכסים''s existing one on the same line: expect ERROR (discounts_no_overlap_specific)'
savepoint t;
insert into discounts (deal_id, deal_service_id, kind, calculation, value, valid_from)
select d.id, ds.id, 'discount', 'percent', 3.00, '2024-06-01'
from deal_services ds join deals d on d.id = ds.deal_id join clients c on c.id = d.client_id
where c.legal_id_number = '514000001';
rollback to t;

\echo '17 -- deal closed_at before opened_at: expect ERROR (deals_dates_ordered)'
savepoint t;
insert into deals (client_id, opened_at, closed_at)
select id, '2026-06-01', '2020-01-01' from clients where legal_id_number = '033333333';
rollback to t;

\echo ''
\echo '--- positive checks (no savepoint -- these should just return correct data) ---'

\echo '18 -- deal_services_current: פרידמן''s closed-deal line must NOT appear'
select count(*) as should_be_zero
from deal_services_current dsc
join deals d on d.id = dsc.deal_id join clients c on c.id = d.client_id
where c.legal_id_number = '557000004';

\echo '19 -- deal_services_current: onboarding client has zero deals, zero rows here too'
select count(*) as should_be_zero
from deal_services_current dsc
join clients c on c.id = dsc.client_id
where c.legal_name = 'עסק חדש בהקמה (טרם התקבל ח.פ.)';

\echo '20 -- deal_services_current: רוזנברג shows 3 active lines with current (not historical) payroll price'
select s.name, dsc.agreed_price, dsc.pricing_basis
from deal_services_current dsc
join clients c on c.id = dsc.client_id
join services s on s.id = dsc.service_id
where c.legal_id_number = '514000003'
order by s.code;

\echo '21 -- ברקוביץ אחזקות: quota terms correctly carried into the view'
select s.name, dsc.quota_amount, dsc.agreed_overage_rate
from deal_services_current dsc
join clients c on c.id = dsc.client_id
join services s on s.id = dsc.service_id
where c.legal_id_number = '514000002';

rollback;
