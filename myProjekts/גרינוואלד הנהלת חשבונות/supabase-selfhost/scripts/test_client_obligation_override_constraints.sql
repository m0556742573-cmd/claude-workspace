-- Constraint battery for client_obligation_overrides (entity 11).
--
-- Same pattern as the other two batteries: every negative test runs inside a
-- SAVEPOINT that is rolled back, so the script leaves nothing behind and is safe
-- to re-run after any schema change.
--
--   cat supabase-selfhost/scripts/test_client_obligation_override_constraints.sql \
--     | ssh ... "docker exec -i supabase-db psql -U postgres -d postgres -f -"

\set ON_ERROR_STOP off

-- Self-contained, like the other two batteries: the whole run is one transaction
-- that is rolled back at the end, so nothing survives even the positive tests.
begin;

create temporary view _t as
select
  (select id from clients where legal_name = 'רוזנברג טכנולוגיות בע"מ')      as rosenberg,
  (select id from clients where legal_name = 'ברקוביץ נכסים בע"מ')          as berkovich,
  (select id from obligation_templates where name = 'הגשת דיווח מע"מ')      as vat_filing,
  (select id from obligation_templates where name = 'תשלום מע"מ')           as vat_payment,
  (select id from obligation_templates where name = 'הגשת דיווח פנסיה')     as pension_filing,
  (select id from obligation_templates where name = 'מקדמות מס הכנסה')      as advances,
  (select id from reporting_frequencies where months_interval = 1)          as monthly,
  (select id from reporting_frequencies where months_interval = 2)          as bimonthly,
  (select p.id from periods p join reporting_frequencies rf on rf.id = p.reporting_frequency_id
    where rf.months_interval = 12 and extract(year from p.start_date) = 2026) as y2026,
  (select p.id from periods p join reporting_frequencies rf on rf.id = p.reporting_frequency_id
    where rf.months_interval = 12 and extract(year from p.start_date) = 2028) as y2028,
  (select p.id from periods p join reporting_frequencies rf on rf.id = p.reporting_frequency_id
    where rf.months_interval = 1 and p.start_date = date '2026-01-01')        as jan2026;

\echo ''
\echo '################ NEGATIVE -- each must FAIL ################'

\echo ''
\echo 'N1  exclude carrying a frequency (meaningless)'
savepoint s; insert into client_obligation_overrides
  (client_id, obligation_template_id, applies, override_frequency_id, frequency_source, valid_from_period_id)
select berkovich, advances, false, monthly, 'other', y2026 from _t; rollback to s;

\echo ''
\echo 'N2  frequency set but no source (system would not know if it may self-update)'
savepoint s; insert into client_obligation_overrides
  (client_id, obligation_template_id, applies, override_frequency_id, valid_from_period_id)
select berkovich, advances, true, monthly, y2026 from _t; rollback to s;

\echo ''
\echo 'N3  source set but no frequency'
savepoint s; insert into client_obligation_overrides
  (client_id, obligation_template_id, applies, frequency_source, valid_from_period_id)
select berkovich, advances, true, 'other', y2026 from _t; rollback to s;

\echo ''
\echo 'N4  unknown frequency source value'
savepoint s; insert into client_obligation_overrides
  (client_id, obligation_template_id, applies, override_frequency_id, frequency_source, valid_from_period_id)
select berkovich, advances, true, monthly, 'because_i_said_so', y2026 from _t; rollback to s;

\echo ''
\echo 'N5  no valid_from period'
savepoint s; insert into client_obligation_overrides
  (client_id, obligation_template_id, applies)
select berkovich, advances, false from _t; rollback to s;

\echo ''
\echo 'N6  validity runs backwards (from 2028 to 2026)'
savepoint s; insert into client_obligation_overrides
  (client_id, obligation_template_id, applies, valid_from_period_id, valid_to_period_id)
select berkovich, advances, false, y2028, y2026 from _t; rollback to s;

\echo ''
\echo 'N7  override on a dependent template (תשלום מע"מ is "after" הגשת דיווח מע"מ)'
savepoint s; insert into client_obligation_overrides
  (client_id, obligation_template_id, applies, override_frequency_id, frequency_source, valid_from_period_id)
select berkovich, vat_payment, true, monthly, 'authority_demand', y2026 from _t; rollback to s;

\echo ''
\echo 'N8  override on a blocking_before template (הגשת דיווח פנסיה)'
savepoint s; insert into client_obligation_overrides
  (client_id, obligation_template_id, applies, valid_from_period_id)
select berkovich, pension_filing, false, y2026 from _t; rollback to s;

\echo ''
\echo 'N9  two overlapping overrides for the same client and template'
savepoint s;
  insert into client_obligation_overrides
    (client_id, obligation_template_id, applies, valid_from_period_id, valid_to_period_id)
  select berkovich, advances, false, y2026, y2028 from _t;
  insert into client_obligation_overrides
    (client_id, obligation_template_id, applies, valid_from_period_id)
  select berkovich, advances, false, y2028 from _t;
rollback to s;

\echo ''
\echo 'N10 deleting a period that an override points at (restrict)'
savepoint s;
  insert into client_obligation_overrides
    (client_id, obligation_template_id, applies, valid_from_period_id)
  select berkovich, advances, false, y2026 from _t;
  delete from periods where id = (select y2026 from _t);
rollback to s;

\echo ''
\echo 'N11 deleting a client that has an override (restrict)'
-- HONEST NOTE: this one is blocked, but by client_official_channels -- the first
-- FK the delete meets -- not by the override table. The deletion is prevented; it
-- is simply not this constraint doing the preventing. Same as the service-deletion
-- test in the obligation-template battery. Left in because the outcome is what
-- matters operationally, and the annotation stops it from claiming more than it
-- proves.
savepoint s;
  insert into client_obligation_overrides
    (client_id, obligation_template_id, applies, valid_from_period_id)
  select berkovich, advances, false, y2026 from _t;
  delete from clients where id = (select berkovich from _t);
rollback to s;

\echo ''
\echo '################ POSITIVE -- each must SUCCEED ################'

\echo ''
\echo 'P1  EXCLUDE: no advances for this client (the case that justified the table)'
savepoint s;
  insert into client_obligation_overrides
    (client_id, obligation_template_id, applies, valid_from_period_id, reason)
  select berkovich, advances, false, y2026, 'פקיד השומה לא קבע מקדמות' from _t;
  select '  -> ' || count(*) || ' row inserted' from client_obligation_overrides
   where client_id = (select berkovich from _t) and applies = false;
rollback to s;

\echo ''
\echo 'P2  INCLUDE: owed although no service pulls it, and at the template frequency'
savepoint s;
  insert into client_obligation_overrides
    (client_id, obligation_template_id, applies, valid_from_period_id, reason)
  select berkovich, vat_filing, true, y2026, 'מטופל בטובה, מחוץ לעסקה' from _t;
  select '  -> ' || count(*) || ' row inserted' from client_obligation_overrides
   where client_id = (select berkovich from _t) and applies = true
     and override_frequency_id is null;
rollback to s;

\echo ''
\echo 'P3  FREQUENCY: monthly by authority demand, scoped and dated'
savepoint s;
  insert into client_obligation_overrides
    (client_id, obligation_template_id, applies, override_frequency_id, frequency_source,
     valid_from_period_id, decided_at, reason)
  select berkovich, vat_filing, true, monthly, 'authority_demand', y2026,
         date '2025-11-03', 'מכתב ממשרד המיסוי' from _t;
  select '  -> ' || count(*) || ' row inserted' from client_obligation_overrides
   where client_id = (select berkovich from _t) and frequency_source = 'authority_demand';
rollback to s;

\echo ''
\echo 'P4  two NON-overlapping overrides on the same client and template'
savepoint s;
  insert into client_obligation_overrides
    (client_id, obligation_template_id, applies, valid_from_period_id, valid_to_period_id)
  select berkovich, advances, false, y2026, y2026 from _t;
  insert into client_obligation_overrides
    (client_id, obligation_template_id, applies, valid_from_period_id)
  select berkovich, advances, false, y2028 from _t;
  select '  -> ' || count(*) || ' rows coexist' from client_obligation_overrides
   where client_id = (select berkovich from _t);
rollback to s;

\echo ''
\echo 'P5  a MONTHLY period is accepted as scope (no over-blocking: scope is not restricted to annual)'
savepoint s;
  insert into client_obligation_overrides
    (client_id, obligation_template_id, applies, valid_from_period_id, reason)
  select berkovich, advances, false, jan2026, 'תוקף מינואר, לא משנת מס שלמה' from _t;
  select '  -> ' || count(*) || ' row inserted' from client_obligation_overrides
   where valid_from_period_id = (select jan2026 from _t);
rollback to s;

\echo ''
\echo 'P6  the row migrated off clients survived and resolves'
select '  -> ' || c.legal_name || ' | ' || ot.name || ' | ' || rf.name
       || ' | source=' || o.frequency_source || ' | from ' || p.label
from client_obligation_overrides o
join clients c on c.id = o.client_id
join obligation_templates ot on ot.id = o.obligation_template_id
join reporting_frequencies rf on rf.id = o.override_frequency_id
join periods p on p.id = o.valid_from_period_id;

\echo ''
\echo 'P7  the two frequency columns are gone from clients'
select '  -> ' || count(*) || ' of them remain (expect 0)'
from information_schema.columns
where table_schema = 'public' and table_name = 'clients'
  and column_name in ('vat_reporting_frequency_id', 'annual_report_frequency_id');

\echo ''
\echo 'P8  active_clients was rebuilt and is back in sync'
select '  -> clients=' || (select count(*) from information_schema.columns
                            where table_schema='public' and table_name='clients')
    || ' view='       || (select count(*) from information_schema.columns
                            where table_schema='public' and table_name='active_clients')
    || ' security_invoker='
    || (select ('security_invoker=true' = any(reloptions))::text
          from pg_class where relname = 'active_clients');

rollback;
