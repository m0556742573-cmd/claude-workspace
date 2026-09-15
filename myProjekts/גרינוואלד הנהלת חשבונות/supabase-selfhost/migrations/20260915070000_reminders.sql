-- Migration: reminders (entity 34) -- one source of truth for every reminder.
--
-- The source: "born from discovering that reminders were scattered across three
-- places (material, collection, pending tasks) and created the risk that a client
-- receives three separate messages on the same day. One central entity, a single
-- source of truth for every reminder engine."
--
-- CONSOLIDATION IS THE POINT, and it is already needed with obligations alone.
-- Rosenberg's February 2026 deadlines fall on the 8th, 15th, 15th and 16th; at
-- seven days' notice two reminders land on the same day. The problem does not wait
-- for charges and tasks to exist.
--
-- ⚠️ obligation_id IS NOT NULL, ON PURPOSE. A reminder will eventually also point
-- at a charge or a task, and the honest shape then is another nullable column plus
-- a CHECK that exactly one is set. Building those columns now would be a junction
-- with only one side in existence -- the rule broken three times already in this
-- project (regulatory calendar, periodic quota, deal before service). When charges
-- exist, this column becomes nullable in the same migration that adds theirs.
--
-- ⚠️ NO SENDING HERE. Message templates (entity 32) and the channel integration do
-- not exist, so there is no batch id and no delivery record beyond sent_at.
-- Inventing them now would mean guessing the shape of something with no consumer.
--
-- A reminder for an obligation that gets completed is simply not due any more --
-- the due view filters on the obligation's status rather than a trigger cancelling
-- rows. Nothing to keep in sync, and a reopened obligation gets its reminder back
-- for free.
--
-- Source of truth: docs/entities/reminders.md

create table reminders (
  id             uuid primary key default gen_random_uuid(),

  client_id      uuid not null references clients(id) on delete restrict,
  obligation_id  uuid not null references obligations(id) on delete restrict,

  scheduled_for  date not null,
  sent_at        timestamptz,

  -- Why this reminder exists, in words, for the day somebody asks why a client got
  -- a message. Filled by the generator.
  reason         text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- One reminder per obligation per date. Re-running the generator must not
  -- produce a second copy of the same nudge.
  constraint reminders_one_per_obligation_per_date
    unique (obligation_id, scheduled_for)
);

comment on table reminders is
  'Entity 34. One row per obligation per scheduled date. Consolidation into one message per client per day is the view.';

alter table reminders enable row level security;

create trigger set_updated_at before update on reminders
  for each row execute function set_updated_at();

create index idx_reminders_client    on reminders (client_id);
create index idx_reminders_scheduled on reminders (scheduled_for) where sent_at is null;

-- ── guard: the reminder's client must be the obligation's client ──
-- Both are stored: client_id for indexing and for the day the source becomes
-- polymorphic and the obligation column goes nullable. Two copies of one fact need
-- something keeping them honest.
create or replace function enforce_reminder_client_matches() returns trigger
language plpgsql as $fn$
declare owner uuid;
begin
  select client_id into owner from obligations where id = new.obligation_id;
  if owner <> new.client_id then
    raise exception 'the reminder is filed under a different client than the obligation it is about';
  end if;
  return new;
end $fn$;

create trigger trg_reminders_client_matches
  before insert or update on reminders
  for each row execute function enforce_reminder_client_matches();

-- ── the generator ──
-- Open obligations only, at the office's own notice period. on conflict do nothing
-- so a re-run never duplicates and never resurrects one already sent.
create or replace function generate_reminders(p_from date, p_to date)
returns integer
language plpgsql as $fn$
declare n integer; notice integer;
begin
  select reminder_days_before into notice from office_settings limit 1;

  insert into reminders (client_id, obligation_id, scheduled_for, reason)
  select o.client_id,
         o.id,
         rc.effective_due_date - notice,
         ot.name || ' — ' || p.label || ', עד ' || rc.effective_due_date
  from obligations o
  join obligation_statuses os  on os.id = o.status_id
  join regulatory_calendar rc  on rc.id = o.regulatory_calendar_id
  join obligation_templates ot on ot.id = rc.obligation_template_id
  join periods p               on p.id  = rc.period_id
  join clients c               on c.id  = o.client_id
  where not os.is_closed
    and c.deleted_at is null
    and (rc.effective_due_date - notice) between p_from and p_to
  on conflict (obligation_id, scheduled_for) do nothing;

  get diagnostics n = row_count;
  return n;
end $fn$;

comment on function generate_reminders(date, date) is
  'Creates reminders for open obligations at the office''s notice period. Never duplicates, never resurrects a sent one.';

-- ── what to actually send: one row per client per day ──
-- THIS is the entity's reason for existing. The table holds one row per
-- obligation; this collapses them so a client gets one message listing everything,
-- not four messages in a morning.
create view reminders_due with (security_invoker = true) as
select
  r.client_id,
  c.legal_name                         as client_name,
  r.scheduled_for,
  count(*)                             as obligation_count,
  min(rc.effective_due_date)            as earliest_due_date,
  string_agg(ot.name || ' (' || p.label || ', עד ' || rc.effective_due_date || ')',
             E'\n' order by rc.effective_due_date) as lines,
  array_agg(r.id order by rc.effective_due_date)   as reminder_ids
from reminders r
join clients c               on c.id = r.client_id
join obligations o           on o.id = r.obligation_id
join obligation_statuses os  on os.id = o.status_id
join regulatory_calendar rc  on rc.id = o.regulatory_calendar_id
join obligation_templates ot on ot.id = rc.obligation_template_id
join periods p               on p.id  = rc.period_id
where r.sent_at is null
  and not os.is_closed          -- completed in the meantime: no longer due
  and c.deleted_at is null
group by r.client_id, c.legal_name, r.scheduled_for;

comment on view reminders_due is
  'One row per client per day -- the message to send. Collapsing here is why entity 34 exists.';
