-- Migration: regulatory_calendar (entity 30) -- the due date for every
-- template x period.
--
-- The source defines it exactly: "a formula computes a base target + a
-- Shabbat/holiday correction (does 90% automatically, requires a holiday table);
-- an override field, empty by default, covers the remaining 10% -- deliberate
-- deferrals by the tax authority that have no formula and no API. An override in
-- one central place updates every client's filing for that period at once."
--
-- So: template x period, WITHOUT client. The authority defers a deadline, one row
-- changes, all 90 clients follow. A per-client row would mean 90 edits and 90
-- chances to miss one.
--
-- THREE LAYERS IN ONE ROW, and all three are kept rather than collapsed:
--   base_due_date     period end + due_month_offset months, on due_day_of_month
--   adjusted_due_date after moving off Shabbat and non-working holidays
--   override_due_date the 10% -- a human decision, empty by default
--   effective_due_date  generated: coalesce(override, adjusted)
--
-- Keeping all three is what lets the office answer "why is the deadline the 17th
-- and not the 15th". Collapsing them into one column loses the reason, and a date
-- nobody can explain is a date nobody trusts.
--
-- ⚠️ THE SAME MACHINE, THIRD APPEARANCE. Regeneration refreshes the computed
-- layers and never touches the override -- exactly as frequency_source governs
-- whether the system may change a frequency (entity 11), and holidays.source
-- governs whether an import may change is_non_working. Three different problems,
-- one shape: a boundary between what the machine owns and what a person owns.
-- It is no longer a coincidence, and the next entity should be checked for it.
--
-- ⚠️ SHORT HORIZON, unlike periods. A period is calendar arithmetic and safe to
-- project to 2035. A due date is not: it depends on holidays (seeded only to 2030)
-- and on authority decisions nobody knows. Generated two years out and refreshed.
--
-- Source of truth: docs/entities/regulatory_calendar.md

-- ── the working-day rule ──
-- Shabbat and non-working holidays only. FRIDAY IS DELIBERATELY NOT HERE: the tax
-- offices are shut but online filing is not, and whether a deadline actually
-- shifts off a Friday is a question about how the authority behaves rather than a
-- fact that can be looked up. Left open rather than guessed.
--
-- Forward, never backward: a deadline that moves earlier would penalise the filer
-- for a rest day. This follows the general principle that a term ending on a rest
-- day extends to the next working day.
create or replace function next_working_day(d date) returns date
language plpgsql stable as $fn$
declare r date := d;
begin
  while extract(dow from r) = 6
        or exists (select 1 from holidays
                    where holiday_date = r and is_non_working)
  loop
    r := r + 1;
  end loop;
  return r;
end $fn$;

comment on function next_working_day(date) is
  'Moves a date forward off Shabbat and non-working holidays. Friday is not treated as non-working -- open question.';

create table regulatory_calendar (
  id                     uuid primary key default gen_random_uuid(),
  obligation_template_id uuid not null references obligation_templates(id) on delete restrict,
  period_id              uuid not null references periods(id) on delete restrict,

  -- layer 1: the formula
  base_due_date          date not null,

  -- layer 2: the correction. adjustment_reason is empty when nothing moved.
  adjusted_due_date      date not null,
  adjustment_reason      text,

  -- layer 3: the 10% the formula cannot reach
  override_due_date      date,
  override_reason        text,
  override_decided_at    date,

  -- what every consumer reads. One column, always right, never out of step with
  -- the three above.
  effective_due_date     date
    generated always as (coalesce(override_due_date, adjusted_due_date)) stored,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint regulatory_calendar_one_per_template_period
    unique (obligation_template_id, period_id),

  -- An override with no reason is a date nobody can defend in six months.
  constraint override_carries_a_reason
    check ((override_due_date is null) = (override_reason is null))
);

comment on table regulatory_calendar is
  'Entity 30. Due date per template x period, without client. One override updates every client at once.';

alter table regulatory_calendar enable row level security;

create trigger set_updated_at before update on regulatory_calendar
  for each row execute function set_updated_at();

create index idx_regulatory_calendar_template on regulatory_calendar (obligation_template_id);
create index idx_regulatory_calendar_period   on regulatory_calendar (period_id);
create index idx_regulatory_calendar_due      on regulatory_calendar (effective_due_date);

-- ── guard: a monthly template cannot have a row against an annual period ──
-- Both sides carry a frequency, so the mismatch is detectable. Without this a
-- generator bug would produce a plausible-looking row with a meaningless date.
create or replace function enforce_calendar_frequency_match() returns trigger
language plpgsql as $fn$
declare tf uuid; pf uuid;
begin
  select reporting_frequency_id into tf from obligation_templates where id = new.obligation_template_id;
  select reporting_frequency_id into pf from periods              where id = new.period_id;
  if tf is distinct from pf then
    raise exception 'template and period have different reporting frequencies -- a % template cannot have a deadline for a % period',
      (select name from reporting_frequencies where id = tf),
      (select name from reporting_frequencies where id = pf);
  end if;
  return new;
end $fn$;

create trigger trg_calendar_frequency_match
  before insert or update on regulatory_calendar
  for each row execute function enforce_calendar_frequency_match();

-- ── the generator ──
-- Refreshes the computed layers and LEAVES THE OVERRIDE ALONE. That is the whole
-- point: re-running after a holiday is added must recompute every adjusted date
-- without erasing a single deferral somebody typed in.
create or replace function generate_regulatory_calendar(p_from date, p_to date)
returns integer
language plpgsql as $fn$
declare n integer;
begin
  with computed as (
    select
      ot.id as template_id,
      p.id  as period_id,
      -- period end + offset months, clamped to the month's real length so that
      -- day 31 does not fall off the end of a 30-day month
      (date_trunc('month', p.end_date) + (ot.due_month_offset || ' months')::interval)::date
        + least(
            ot.due_day_of_month,
            extract(day from
              (date_trunc('month', p.end_date) + (ot.due_month_offset || ' months')::interval
               + interval '1 month' - interval '1 day'))::int
          ) - 1 as base_due
    from obligation_templates ot
    join periods p on p.reporting_frequency_id = ot.reporting_frequency_id
    where ot.is_active
      and p.end_date between p_from and p_to
  )
  insert into regulatory_calendar
    (obligation_template_id, period_id, base_due_date, adjusted_due_date, adjustment_reason)
  select
    c.template_id,
    c.period_id,
    c.base_due,
    next_working_day(c.base_due),
    case
      when next_working_day(c.base_due) = c.base_due then null
      when extract(dow from c.base_due) = 6 then 'נדחה משבת'
      else 'נדחה מ' || coalesce((select string_agg(h.name, ', ')
                                   from holidays h
                                  where h.holiday_date = c.base_due and h.is_non_working), 'יום שאינו עבודה')
    end
  from computed c
  on conflict (obligation_template_id, period_id) do update
    set base_due_date     = excluded.base_due_date,
        adjusted_due_date = excluded.adjusted_due_date,
        adjustment_reason = excluded.adjustment_reason;
        -- override_due_date, override_reason and override_decided_at are
        -- intentionally absent: the machine refreshes its own layers only.

  get diagnostics n = row_count;
  return n;
end $fn$;

comment on function generate_regulatory_calendar(date, date) is
  'Generates/refreshes deadlines for periods ending in the range. Never touches an override.';
