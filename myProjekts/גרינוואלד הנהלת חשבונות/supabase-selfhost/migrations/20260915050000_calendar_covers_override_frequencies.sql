-- Corrective migration: the calendar must cover every frequency a template is
-- actually used at, not only its own default.
--
-- Found by generating obligations for the first time. Rosenberg files VAT MONTHLY
-- by override (entity 11), but regulatory_calendar was generated strictly at each
-- template's own frequency -- bi-monthly for VAT -- so there were no monthly VAT
-- deadlines for his obligations to attach to. He received bi-monthly obligations.
--
-- The frequency override was therefore COSMETIC: correct in the resolved view,
-- absent from the work the office would actually do. The whole point of entity 11
-- is that a client on a different cadence files on a different cadence.
--
-- And the trigger written an hour earlier cemented the mistake. It demanded that
-- the period's frequency equal the template's, which is only true when no client
-- deviates. The correct rule is weaker and truer: the period's frequency must be
-- one somebody actually uses for that template -- its default, or some client's
-- override. A monthly period against an annual template is still nonsense and
-- still blocked.
--
-- This is the kind of defect that only appears on contact with use. It was not
-- visible in the view, in the constraint battery, or in the calendar's own tests,
-- because every one of those asked about a template in isolation.
--
-- Source of truth: docs/entities/regulatory_calendar.md

-- ── the relaxed guard ──
create or replace function enforce_calendar_frequency_match() returns trigger
language plpgsql as $fn$
declare pf uuid; ok boolean;
begin
  select reporting_frequency_id into pf from periods where id = new.period_id;

  select exists (
    -- the template's own cadence
    select 1 from obligation_templates ot
     where ot.id = new.obligation_template_id
       and ot.reporting_frequency_id = pf
    union all
    -- or a cadence some client was actually put on for this template
    select 1 from client_obligation_overrides o
     where o.obligation_template_id = new.obligation_template_id
       and o.override_frequency_id = pf
    union all
    -- or a cadence this template INHERITS, because it is dependent and its anchor
    -- carries the override. An override may not be recorded on a dependent
    -- template at all, so this is the only way its cadence can be reached.
    select 1 from obligation_templates ot_self
     join client_obligation_overrides o
       on o.obligation_template_id = ot_self.linked_template_id
     where ot_self.id = new.obligation_template_id
       and o.override_frequency_id = pf
  ) into ok;

  if not ok then
    raise exception
      'no client files this obligation at a % cadence -- neither the template default nor any override uses it',
      (select name from reporting_frequencies where id = pf);
  end if;
  return new;
end $fn$;

-- ── the generator now covers both ──
create or replace function generate_regulatory_calendar(p_from date, p_to date)
returns integer
language plpgsql as $fn$
declare n integer;
begin
  with used as (
    -- every (template, frequency) pair actually in use
    select ot.id as template_id, ot.reporting_frequency_id as frequency_id,
           ot.due_month_offset, ot.due_day_of_month
    from obligation_templates ot
    where ot.is_active
    union
    select ot.id, o.override_frequency_id, ot.due_month_offset, ot.due_day_of_month
    from client_obligation_overrides o
    join obligation_templates ot on ot.id = o.obligation_template_id
    where ot.is_active
      and o.override_frequency_id is not null
    union
    -- ⚠️ And the cadence a DEPENDENT template inherits from its anchor. An override
    -- cannot be recorded on a dependent template -- the anchor rule blocks it -- so
    -- without this branch a dependent silently gets no calendar entry at its real
    -- cadence, and its obligations vanish rather than error. That is precisely the
    -- goal-1 failure: not late, simply absent.
    --
    -- This mirrors the inherited_from_anchor branch in client_obligations_at. Two
    -- places now resolve frequency, and they must agree; if a third rule is ever
    -- added there, it belongs here too.
    select ot_dep.id, o.override_frequency_id, ot_dep.due_month_offset, ot_dep.due_day_of_month
    from client_obligation_overrides o
    join obligation_templates ot_dep on ot_dep.linked_template_id = o.obligation_template_id
    where ot_dep.is_active
      and o.override_frequency_id is not null
  ),
  computed as (
    select
      u.template_id,
      p.id as period_id,
      (date_trunc('month', p.end_date) + (u.due_month_offset || ' months')::interval)::date
        + least(
            u.due_day_of_month,
            extract(day from
              (date_trunc('month', p.end_date) + (u.due_month_offset || ' months')::interval
               + interval '1 month' - interval '1 day'))::int
          ) - 1 as base_due
    from used u
    join periods p on p.reporting_frequency_id = u.frequency_id
    where p.end_date between p_from and p_to
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
        -- the three override columns stay absent, as before

  get diagnostics n = row_count;
  return n;
end $fn$;

-- Refresh the range already generated so the missing monthly VAT deadlines appear.
select generate_regulatory_calendar(date '2026-01-01', date '2027-12-31');
