-- Removes everything 9001_scenario_smoke_test.sql inserted, and nothing else.
--
-- Why this exists: the scenario rows live in the dev DB so they can be browsed
-- in Studio. Before real client data goes in — and certainly before production —
-- run this, so nobody has to work out later which rows were fake.
--
-- Targets are pinned to the exact identifiers the scenario file uses. It will
-- not touch a real client even if one happens to share a name.
--
-- Deletion order matters: FKs are `on delete restrict` per decisions/0007, so
-- children go first. That is by design — it is the same protection that stops
-- an accidental client deletion.

begin;

create temp table _scn_clients on commit drop as
  select id from clients
  where legal_id_number in ('033333333','514000001','514000002','514000003','557000004')
     or legal_name = 'עסק חדש בהקמה (טרם התקבל ח.פ.)';

create temp table _scn_contacts on commit drop as
  select id from contacts
  where id_number in ('011111111','022222222','033333333','044444444',
                      '055555555','066666666','077777777','088888888');

create temp table _scn_employees on commit drop as
  select id from office_employees where contact_id in (select id from _scn_contacts);

-- Captured BEFORE the rows are deleted, so the audit cleanup below can be scoped
-- to exactly these credentials instead of to "any credential that no longer exists"
-- — which would have taken real audit history with it.
create temp table _scn_credentials on commit drop as
  select id from client_credentials where client_id in (select id from _scn_clients);

-- ── children of clients ──
delete from client_official_channels where client_id in (select id from _scn_clients);
delete from client_contact_responsibilities
  where client_contact_id in (select id from client_contacts where client_id in (select id from _scn_clients));
delete from client_contacts        where client_id in (select id from _scn_clients);
delete from client_credentials     where client_id in (select id from _scn_clients);
delete from client_bank_accounts   where client_id in (select id from _scn_clients);
delete from client_turnover_history where client_id in (select id from _scn_clients);
delete from client_notes           where client_id in (select id from _scn_clients);
delete from client_tags            where client_id in (select id from _scn_clients);

-- ── channels: owned by either a scenario client or a scenario contact ──
delete from channels
  where client_id in (select id from _scn_clients)
     or contact_id in (select id from _scn_contacts);

-- ── audit rows for scenario records ──
-- In practice the scenario file only inserts, and the audit triggers fire on
-- UPDATE, so this normally removes nothing. It is here so the cleanup stays
-- correct if someone edits a scenario row in Studio before running it.
delete from audit_log
  where (table_name = 'clients'            and record_id in (select id from _scn_clients))
     or (table_name = 'client_credentials' and record_id in (select id from _scn_credentials));

delete from clients where id in (select id from _scn_clients);

-- ── office staff ──
delete from employee_specializations where employee_id in (select id from _scn_employees);
delete from employee_absences        where employee_id in (select id from _scn_employees)
                                        or covering_employee_id in (select id from _scn_employees);
delete from office_employees         where id in (select id from _scn_employees);

delete from contacts where id in (select id from _scn_contacts);

-- Sanity: everything below must be 0 before you commit.
select 'clients'  as tbl, count(*) from clients  where legal_id_number in
       ('033333333','514000001','514000002','514000003','557000004')
union all
select 'contacts', count(*) from contacts where id_number in
       ('011111111','022222222','033333333','044444444','055555555','066666666','077777777','088888888');

commit;
