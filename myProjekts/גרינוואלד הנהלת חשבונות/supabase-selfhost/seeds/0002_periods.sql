-- Seed: the period rows themselves (entity 29).
--
-- periods is the shared binder every periodic entity points at, and it was empty
-- -- zero rows since it was created on 30/08. Nothing periodic could be recorded
-- at all: not an obligation for January, not "in force from tax year 2026".
--
-- Range: 2024 through 2035. Two years back so turnover history and
-- threshold-crossing checks have something to point at; twelve forward because
-- the failure is asymmetric -- periods running out means the generator silently
-- produces nothing, which is precisely the failure goal 1 exists to prevent,
-- while extra rows cost nothing but a longer picker.
--
-- A period is pure calendar arithmetic and is safe to project forward. A DUE DATE
-- is not -- it depends on holidays and authority decisions nobody knows yet. The
-- regulatory calendar (entity 30) must therefore be generated short and refreshed,
-- never seeded to this horizon.
--
-- Idempotent: unique (reporting_frequency_id, start_date, end_date) carries it, so
-- this is safe to re-run and safe to re-run after extending the range.
--
-- Source of truth: docs/entities/periods.md

-- Hebrew month names, indexed by month number.
create temporary table _months (n int primary key, name text) on commit drop;
insert into _months values
  (1,'ינואר'),(2,'פברואר'),(3,'מרץ'),(4,'אפריל'),(5,'מאי'),(6,'יוני'),
  (7,'יולי'),(8,'אוגוסט'),(9,'ספטמבר'),(10,'אוקטובר'),(11,'נובמבר'),(12,'דצמבר');

-- ── monthly: 144 rows ──
insert into periods (reporting_frequency_id, start_date, end_date, label)
select f.id,
       d::date,
       (d + interval '1 month' - interval '1 day')::date,
       m.name || ' ' || extract(year from d)::int
from reporting_frequencies f
cross join generate_series(date '2024-01-01', date '2035-12-01', interval '1 month') d
join _months m on m.n = extract(month from d)::int
where f.name = 'חד-חודשי'
on conflict (reporting_frequency_id, start_date, end_date) do nothing;

-- ── bi-monthly: 72 rows. Israeli VAT pairs are Jan-Feb, Mar-Apr, ... Nov-Dec. ──
insert into periods (reporting_frequency_id, start_date, end_date, label)
select f.id,
       d::date,
       (d + interval '2 months' - interval '1 day')::date,
       m1.name || '-' || m2.name || ' ' || extract(year from d)::int
from reporting_frequencies f
cross join generate_series(date '2024-01-01', date '2035-11-01', interval '2 months') d
join _months m1 on m1.n = extract(month from d)::int
join _months m2 on m2.n = extract(month from d)::int + 1
where f.name = 'דו-חודשי'
on conflict (reporting_frequency_id, start_date, end_date) do nothing;

-- ── yearly: 12 rows ──
insert into periods (reporting_frequency_id, start_date, end_date, label)
select f.id,
       make_date(y::int, 1, 1),
       make_date(y::int, 12, 31),
       'שנת ' || y::int
from reporting_frequencies f
cross join generate_series(2024, 2035) y
where f.name = 'שנתי'
on conflict (reporting_frequency_id, start_date, end_date) do nothing;
