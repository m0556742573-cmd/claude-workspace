-- Migration: the audit log reaches the money.
--
-- Found in the deep review on 14/09 and flagged as a cheap fix, then not done.
-- Audit triggers existed on exactly two tables -- clients and client_credentials.
-- Not on deals, deal_services, deal_service_terms or discounts.
--
-- Goal 9 is "zero he-said-she-said disputes", and the dispute a client is most
-- likely to raise is about PRICE. Price changes were the least audited thing in
-- the system.
--
-- ⚠️ AND A SECOND GAP THAT MATTERS MORE HERE THAN ANYWHERE ELSE. The existing
-- trigger fires on UPDATE only. For clients that is a limitation; for the money
-- tables it is a hole straight through the middle, because deal_service_terms and
-- discounts express a change of price as a NEW ROW with a new validity range, not
-- as an update of the old one. An UPDATE-only trigger would have watched the money
-- tables and recorded nothing at all for the one event it exists to record.
--
-- So log_audited_changes now handles all three operations, with one row per
-- audited column in every case:
--   UPDATE  only the columns that actually changed (unchanged behaviour)
--   INSERT  every audited column, old_value null
--   DELETE  every audited column, new_value null
--
-- One shape, and no magic sentinel values in changed_field.
--
-- ⚠️ Teaching the FUNCTION about insert and delete is not enough: the clients and
-- client_credentials triggers are declared "after update" and would go on firing
-- only on update. Caught by a test that created a client and saw zero audit rows.
-- Both are recreated below over all three events, which closes the gap recorded in
-- status.md -- "audit_log catches updates only; creation and deletion are not
-- recorded, and for client_credentials that is a real hole".
--
-- Still not caught: reads. A trigger cannot see a SELECT, so "who looked at this
-- client's credentials" remains outside the database's reach.
-- changed_by stays null until Auth exists.
--
-- Source of truth: docs/entities/audit_log.md

create or replace function log_audited_changes() returns trigger
language plpgsql as $fn$
declare
  col   text;
  old_v text;
  new_v text;
  rec   uuid;
begin
  rec := coalesce(new.id, old.id);

  foreach col in array tg_argv loop
    if tg_op = 'INSERT' then
      execute format('select null::text, ($1).%I::text', col) into old_v, new_v using new;
    elsif tg_op = 'DELETE' then
      execute format('select ($1).%I::text, null::text', col) into old_v, new_v using old;
    else
      execute format('select ($1).%I::text, ($2).%I::text', col, col)
        into old_v, new_v using old, new;
    end if;

    -- On UPDATE only real changes are worth a row. On INSERT and DELETE every
    -- audited column is the event, so a null-to-null column is still skipped --
    -- it says nothing.
    if old_v is distinct from new_v then
      insert into audit_log (table_name, record_id, changed_field, old_value, new_value)
      values (tg_table_name, rec, col, old_v, new_v);
    end if;
  end loop;

  return coalesce(new, old);
end $fn$;

comment on function log_audited_changes() is
  'Field-level audit for insert, update and delete. Audited columns are passed as trigger arguments.';

-- ── the money ──
-- deal_service_terms first: this is where the price lives, and the only place it
-- lives. A price change is a new row here.
create trigger trg_deal_service_terms_audit
  after insert or update or delete on deal_service_terms
  for each row execute function log_audited_changes(
    'agreed_price', 'agreed_overage_rate', 'quota_amount',
    'billing_frequency_id', 'valid_from', 'valid_to', 'reason');

create trigger trg_discounts_audit
  after insert or update or delete on discounts
  for each row execute function log_audited_changes(
    'kind', 'calculation', 'value', 'conflict_resolution',
    'valid_from', 'valid_to', 'deal_service_id', 'reason');

-- What the client receives and from when. Not money itself, but the thing a
-- disputed invoice is argued against.
create trigger trg_deal_services_audit
  after insert or update or delete on deal_services
  for each row execute function log_audited_changes(
    'service_id', 'started_at', 'ended_at', 'is_active');

-- Opening and closing the account, and why.
create trigger trg_deals_audit
  after insert or update or delete on deals
  for each row execute function log_audited_changes(
    'opened_at', 'closed_at', 'closure_reason');

-- ── the two existing triggers, recreated over all three events ──
-- Same names and same audited columns as before -- only the event list changes. The
-- real names are trg_*_audit, not audit_*; dropping the wrong name would have been
-- a no-op and left TWO triggers logging every change twice. Caught before running. Creation and
-- deletion of a client, and of a credential, are now recorded.
drop trigger if exists trg_clients_audit on clients;
create trigger trg_clients_audit
  after insert or update or delete on clients
  for each row execute function log_audited_changes(
    'status_id', 'responsible_employee_id', 'entity_type_id',
    'legal_name', 'legal_id_number', 'deleted_at');

drop trigger if exists trg_client_credentials_audit on client_credentials;
create trigger trg_client_credentials_audit
  after insert or update or delete on client_credentials
  for each row execute function log_audited_changes(
    'credential_type_id', 'system_name', 'username',
    'identification_type', 'valid_until');
