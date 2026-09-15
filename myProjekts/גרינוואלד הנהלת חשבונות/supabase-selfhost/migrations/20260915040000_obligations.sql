-- Migration: obligations (entity 10) -- the filings and payments themselves.
--
-- This is the entity everything built so far exists to serve. A row here is a real
-- thing the office must do: Rosenberg's VAT for Jan-Feb 2026, due 2026-03-15.
--
-- It is (client x calendar entry). The calendar entry already carries the template,
-- the period and the effective due date, so pointing at it gives all three and
-- guarantees a deadline exists before an obligation can.
--
-- ⚠️ THE DUE DATE IS NOT COPIED HERE. It is read through the calendar, because the
-- source is explicit: "an override in one central place updates every client's
-- filing for that period at once." Copying would mean 90 rows to update and 90
-- chances to miss one.
--
-- This is the OPPOSITE of the choice made for price, which IS copied into a
-- charge. The rule that separates them: copy when the record was issued to a third
-- party and must not change afterwards (an invoice); join when the fact belongs to
-- a third party and they may restate it (a deadline the tax authority sets).
--
-- ⚠️ "FILING = TEMPLATE x PERIOD x CLIENT" IS A PARTIAL INDEX, NOT A UNIQUE
-- CONSTRAINT. Recorded as a warning on 31/08: as a plain unique constraint it
-- blocks amended filings completely, and Yitzhak decided to support them -- "the
-- system should not require managing anything outside it". So: one original per
-- client x calendar entry, unlimited amendments hanging off it.
--
-- ⚠️ LATE IS NOT STORED. It is "not closed and the due date has passed", computed
-- at read time. A stored flag needs a nightly job to flip it and lies between runs
-- -- exactly the TODAY() problem the source warns about, and the reason the spec's
-- formula fields became views everywhere else in this project.
--
-- NOT BUILT HERE, deliberately:
--   priority        -- a whole sub-system (tags, legal precedence, lateness, fine
--                      size) and probably computed rather than stored
--   aggregates      -- the fifth relation type, for form 126 summarising twelve
--                      deductions filings. No demo template uses form 126, and a
--                      relation type with no case is the situation where a
--                      speculative model turns out wrong
--   material blocks -- the source has a filing "ask whether material types were
--                      marked received". Entity 12 does not exist yet
--   payroll blocks  -- same, entity 16
--
-- Source of truth: docs/entities/obligations.md

-- ── status lookup ──
-- A lookup and not a CHECK, per decisions/0006: the office will want intermediate
-- states of its own -- "waiting for material", "in progress", "filed, awaiting
-- confirmation" -- and those are the office's vocabulary. The code only needs to
-- know which states count as finished, which is what is_closed carries. Same shape
-- as client_statuses with continues_collection.
create table obligation_statuses (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  name       text not null,
  is_closed  boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table obligation_statuses enable row level security;

insert into obligation_statuses (code, name, is_closed, sort_order) values
  ('open',      'פתוח',   false, 10),
  ('done',      'הוגש',   true,  20),
  ('cancelled', 'בוטל',   true,  30);

comment on table obligation_statuses is
  'Lookup. is_closed is the only thing code needs; the office may add its own states.';

-- ── the obligations themselves ──
create table obligations (
  id                      uuid primary key default gen_random_uuid(),

  client_id               uuid not null references clients(id) on delete restrict,
  -- Carries template, period and effective_due_date in one reference, and makes a
  -- deadline a precondition for an obligation existing at all.
  regulatory_calendar_id  uuid not null references regulatory_calendar(id) on delete restrict,

  status_id               uuid not null references obligation_statuses(id) on delete restrict,

  completed_at            date,
  completed_by            uuid references office_employees(id) on delete restrict,
  -- The authority's receipt. The thing the office is asked for when a filing is
  -- disputed, and the reason goal 9 exists.
  confirmation_number     text,

  -- An amendment points at the original. Self-reference rather than a flag,
  -- because a correction is an event between two instances -- the distinction
  -- drawn on 31/08 when "amendment" was rejected as a fifth relation type between
  -- templates.
  amends_id               uuid references obligations(id) on delete restrict,

  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table obligations is
  'Entity 10. One row per client x calendar entry. Due date is read through the calendar, never copied.';

alter table obligations enable row level security;

create trigger set_updated_at before update on obligations
  for each row execute function set_updated_at();

-- One ORIGINAL per client x calendar entry. Amendments are unconstrained.
create unique index obligations_one_original_per_client_period
  on obligations (client_id, regulatory_calendar_id)
  where amends_id is null;

create index idx_obligations_client   on obligations (client_id);
create index idx_obligations_calendar on obligations (regulatory_calendar_id);
create index idx_obligations_status   on obligations (status_id);
create index idx_obligations_open     on obligations (regulatory_calendar_id) where completed_at is null;

-- ── guard 1: a closed obligation must say when it was completed ──
-- is_closed lives on the lookup, so this cannot be a CHECK.
create or replace function enforce_completion_date_matches_status() returns trigger
language plpgsql as $fn$
declare closed boolean;
begin
  select is_closed into closed from obligation_statuses where id = new.status_id;
  if closed and new.completed_at is null then
    raise exception 'an obligation in a closed status must carry a completion date';
  end if;
  if not closed and new.completed_at is not null then
    raise exception 'an open obligation cannot carry a completion date';
  end if;
  return new;
end $fn$;

create trigger trg_obligations_completion_date
  before insert or update on obligations
  for each row execute function enforce_completion_date_matches_status();

-- ── guard 2: an amendment must amend the same thing, and be allowed ──
create or replace function enforce_amendment_is_valid() returns trigger
language plpgsql as $fn$
declare orig record; allows boolean;
begin
  if new.amends_id is null then
    return new;
  end if;

  select o.client_id, o.regulatory_calendar_id, o.amends_id
    into orig
  from obligations o where o.id = new.amends_id;

  if orig.client_id <> new.client_id
     or orig.regulatory_calendar_id <> new.regulatory_calendar_id then
    raise exception 'an amendment must be for the same client, template and period as the filing it amends';
  end if;

  if orig.amends_id is not null then
    raise exception 'amend the original filing, not another amendment -- otherwise the chain has no single root';
  end if;

  select ot.allows_amendments into allows
  from regulatory_calendar rc
  join obligation_templates ot on ot.id = rc.obligation_template_id
  where rc.id = new.regulatory_calendar_id;

  if not coalesce(allows, false) then
    raise exception 'this obligation type does not allow amendments';
  end if;

  return new;
end $fn$;

create trigger trg_obligations_amendment_valid
  before insert or update on obligations
  for each row execute function enforce_amendment_is_valid();

-- ── guard 3: a blocked obligation cannot close before its blocker ──
-- Both relation types reduce to a predecessor. 'after' means this one follows the
-- template it links to; 'blocking_before' means the template it links to follows
-- THIS one. Either way, for the same client and period, the predecessor must be
-- closed first.
--
-- Payroll-run blocking and material blocking are the other half of the source's
-- rule and wait for entities 16 and 12.
create or replace function enforce_blocking_predecessor() returns trigger
language plpgsql as $fn$
declare closed boolean; pred_name text; pred_open int;
begin
  select os.is_closed into closed from obligation_statuses os where os.id = new.status_id;
  if not closed then
    return new;
  end if;

  select count(*), min(ot_pred.name)
    into pred_open, pred_name
  from regulatory_calendar rc_self
  join obligation_templates ot_self on ot_self.id = rc_self.obligation_template_id
  -- the predecessor template: whichever side of the link comes first
  join obligation_templates ot_pred
    on (ot_self.relation_type = 'after'  and ot_pred.id = ot_self.linked_template_id)
    or (ot_pred.relation_type = 'blocking_before' and ot_pred.linked_template_id = ot_self.id)
  join regulatory_calendar rc_pred
    on rc_pred.obligation_template_id = ot_pred.id
   and rc_pred.period_id = rc_self.period_id
  join obligations o_pred
    on o_pred.regulatory_calendar_id = rc_pred.id
   and o_pred.client_id = new.client_id
   and o_pred.amends_id is null
  join obligation_statuses os_pred on os_pred.id = o_pred.status_id
  where rc_self.id = new.regulatory_calendar_id
    and not os_pred.is_closed;

  if pred_open > 0 then
    raise exception 'cannot close this obligation while "%" for the same period is still open', pred_name;
  end if;
  return new;
end $fn$;

create trigger trg_obligations_blocking
  before insert or update on obligations
  for each row execute function enforce_blocking_predecessor();

-- ── the generator ──
-- For each period in range, ask what each client owed AS OF THAT PERIOD -- not as
-- of today. That is what client_obligations_at exists for, and why the view was
-- refactored into a function first: a client whose service ended in March must not
-- receive obligations for June.
--
-- on conflict do nothing: re-running never disturbs work already recorded against
-- an existing obligation. The fourth appearance of the same boundary.
create or replace function generate_obligations(p_from date, p_to date)
returns integer
language plpgsql as $fn$
declare n integer; open_status uuid;
begin
  select id into open_status from obligation_statuses where code = 'open';

  insert into obligations (client_id, regulatory_calendar_id, status_id)
  select res.client_id, rc.id, open_status
  from regulatory_calendar rc
  join periods p on p.id = rc.period_id
  cross join lateral client_obligations_at(p.end_date) res
  where p.end_date between p_from and p_to
    and res.obligation_template_id = rc.obligation_template_id
    -- ⚠️ The client's RESOLVED cadence, not the template's. A client on a monthly
    -- VAT override files monthly, so his obligations must hang off the monthly
    -- calendar entries and not the bi-monthly ones. Without this line the override
    -- is cosmetic -- right in the resolved view, absent from the actual work --
    -- which is exactly what the first generation run produced.
    and p.reporting_frequency_id = res.reporting_frequency_id
  on conflict (client_id, regulatory_calendar_id) where amends_id is null do nothing;

  get diagnostics n = row_count;
  return n;
end $fn$;

comment on function generate_obligations(date, date) is
  'Creates obligations for periods ending in the range, resolved as of each period. Never disturbs existing rows.';

-- ── the work list ──
-- What the office opens in the morning. Late is computed here, not stored.
create view obligations_worklist with (security_invoker = true) as
select
  o.id                                          as obligation_id,
  c.legal_name                                  as client_name,
  ot.name                                       as obligation_name,
  ot.action_type,
  ot.form_number,
  a.name                                        as authority_name,
  p.label                                       as period_label,
  rc.effective_due_date                         as due_date,
  rc.adjustment_reason,
  rc.override_reason,
  os.name                                       as status_name,
  os.is_closed,
  o.completed_at,
  o.confirmation_number,
  (o.amends_id is not null)                     as is_amendment,
  (not os.is_closed and rc.effective_due_date < current_date) as is_late,
  case when os.is_closed then null
       else rc.effective_due_date - current_date
  end                                           as days_remaining
from obligations o
join clients c                on c.id = o.client_id
join obligation_statuses os   on os.id = o.status_id
join regulatory_calendar rc   on rc.id = o.regulatory_calendar_id
join obligation_templates ot  on ot.id = rc.obligation_template_id
join periods p                on p.id = rc.period_id
join authorities a            on a.id = ot.authority_id
where c.deleted_at is null;

comment on view obligations_worklist is
  'The morning list. is_late and days_remaining are computed, never stored.';
