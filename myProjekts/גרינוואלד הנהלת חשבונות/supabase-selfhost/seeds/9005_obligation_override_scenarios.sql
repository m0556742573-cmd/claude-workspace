-- Demo rows for entity 11, one per direction.
--
-- The table held a single row -- the frequency override migrated off
-- clients.vat_reporting_frequency_id. The other two directions had never existed
-- as persistent data, only inside tests that rolled back. A direction that has
-- never survived a COMMIT is a direction nobody has actually seen work.
--
-- Three rows, chosen so the resolved view shows every case at once:
--
--   EXCLUDE   Berkovich Properties derives income tax advances from bookkeeping,
--             but the assessing officer never set any. This is the case that
--             justified the entire table.
--   INCLUDE   Avi Mizrahi buys consulting only and so derives nothing at all. The
--             office files his annual report as a favour -- outside the deal,
--             because a deal is a contract and nobody amends a contract for a
--             favour. He goes from zero obligations to one, purely by override.
--   FREQUENCY already present from the migration: Rosenberg reports VAT monthly
--             rather than bi-monthly. Left alone here so the seed stays idempotent.
--
-- Demo data. Clean before production, like 9001/9003/9004.
-- Idempotent: each insert is guarded by a NOT EXISTS on the same client+template.

-- EXCLUDE: no advances for this client
insert into client_obligation_overrides
  (client_id, obligation_template_id, applies, valid_from_period_id, decided_at, reason)
select c.id,
       ot.id,
       false,
       p.id,
       date '2024-02-11',
       'פקיד השומה לא קבע מקדמות ללקוח זה'
from clients c
cross join obligation_templates ot
cross join lateral (
  select p.id from periods p
  join reporting_frequencies rf on rf.id = p.reporting_frequency_id
  where rf.months_interval = 12 and extract(year from p.start_date) = 2024
) p
where c.legal_name = 'ברקוביץ נכסים בע"מ'
  and ot.name = 'מקדמות מס הכנסה'
  and not exists (
    select 1 from client_obligation_overrides o
    where o.client_id = c.id and o.obligation_template_id = ot.id
  );

-- INCLUDE: handled as a favour, pulled by no service
insert into client_obligation_overrides
  (client_id, obligation_template_id, applies, valid_from_period_id, decided_at, reason)
select c.id,
       ot.id,
       true,
       p.id,
       date '2024-05-20',
       'מטופל בטובה, מחוץ לעסקה — לא נגרר משום שירות'
from clients c
cross join obligation_templates ot
cross join lateral (
  select p.id from periods p
  join reporting_frequencies rf on rf.id = p.reporting_frequency_id
  where rf.months_interval = 12 and extract(year from p.start_date) = 2024
) p
where c.legal_name = 'אבי מזרחי'
  and ot.name = 'הגשת דוח שנתי'
  and not exists (
    select 1 from client_obligation_overrides o
    where o.client_id = c.id and o.obligation_template_id = ot.id
  );
