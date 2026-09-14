-- Migration: entity 11 -- client_obligation_overrides.
--
-- The derivation chain (client -> deal -> services -> templates -> entity-type
-- filter) produces a default set of obligations per client. It is right most of
-- the time and wrong for some clients. This table is the only place that says
-- "for this client it is different", and it is SPARSE by design: a row exists
-- only where there is a deviation. The resolved list is derived, never stored.
--
-- The source left the entity conditional -- "if per-client exceptions do not
-- actually happen, derive straight from the deal" -- with a leaning toward
-- deleting it. Income tax advances are the proof that they do happen: the
-- assessing officer sets them per client, and not every client has them.
--
-- Three cases, and the third is why this took several reversals to settle:
--   applies=false, no frequency   -> EXCLUDE. The chain produced it, the client
--                                    does not owe it (advances never set).
--   applies=true,  frequency set  -> DIFFERENT FREQUENCY. Owes it, at another
--                                    cadence (turnover over 1,500,000 -> monthly).
--   applies=true,  no frequency   -> INCLUDE. Owed, pulled by no service at all.
--                                    Yitzhak: "not every small thing or favour is
--                                    a change to the deal" -- a deal is a contract,
--                                    and nobody amends a contract for a favour.
-- Only applies=false WITH a frequency is meaningless, and that is what the CHECK
-- forbids. An earlier draft of the spec carried a stricter CHECK written before
-- the include direction came back; it would have forbidden the include case.
--
-- Source of truth: docs/entities/client_obligation_overrides.md

create table client_obligation_overrides (
  id                     uuid primary key default gen_random_uuid(),
  client_id              uuid not null references clients(id) on delete restrict,
  obligation_template_id uuid not null references obligation_templates(id) on delete restrict,

  -- The direction. An explicit field rather than derived by comparing the row
  -- against the chain: that comparison changes its answer when the deal changes,
  -- so an "exclude" row would silently become an "include" and the original
  -- intent would be erased with nobody touching the row.
  applies                boolean not null,

  override_frequency_id  uuid references reporting_frequencies(id) on delete restrict,

  -- Why the frequency differs -- and this decides whether the system may change
  -- the value on its own. "turnover_derived" means it may raise an alert when
  -- turnover moves; "authority_demand" means it must not touch it even if turnover
  -- falls, because the demand stands. Without this field the system could push a
  -- client back to bi-monthly against the authority's instruction.
  -- CHECK and not a lookup, per decisions/0006 and 0009: each value drives
  -- different behaviour in code, so a fourth value needs code, not a row.
  frequency_source       text,

  -- Scope in periods, not dates. Yitzhak: "if I want to filter by 2026 I want it
  -- to come from a period, not a guess." valid_to empty = still in force. Same
  -- pattern as deal_service_terms.
  valid_from_period_id   uuid not null references periods(id) on delete restrict,
  valid_to_period_id     uuid references periods(id) on delete restrict,

  reason                 text,

  -- What it applies to (the periods above) and when it was decided are two
  -- different things -- Yitzhak's distinction. "From tax year 2027" and "the
  -- letter arrived in March 2026" do not belong in one field.
  decided_at             date,
  decided_by             uuid references office_employees(id) on delete restrict,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint excluded_obligation_carries_no_frequency
    check (applies or override_frequency_id is null),

  constraint frequency_source_matches_frequency
    check ((override_frequency_id is null and frequency_source is null)
        or (override_frequency_id is not null
            and frequency_source in ('turnover_derived', 'authority_demand', 'other')))
);

comment on table client_obligation_overrides is
  'Entity 11. Sparse per-client deviations from the derived obligation set.';

alter table client_obligation_overrides enable row level security;

create trigger set_updated_at before update on client_obligation_overrides
  for each row execute function set_updated_at();

create index idx_client_obligation_overrides_client
  on client_obligation_overrides (client_id);
create index idx_client_obligation_overrides_template
  on client_obligation_overrides (obligation_template_id);

-- guard 1: the scope must not run backwards.
-- The dates live on periods, so this cannot be a CHECK.
create or replace function enforce_override_period_order() returns trigger
language plpgsql as $fn$
declare f date; t date;
begin
  if new.valid_to_period_id is null then
    return new;
  end if;
  select start_date into f from periods where id = new.valid_from_period_id;
  select end_date   into t from periods where id = new.valid_to_period_id;
  if t < f then
    raise exception 'override validity runs backwards: to-period ends %, from-period starts %', t, f;
  end if;
  return new;
end $fn$;

create trigger trg_override_period_order
  before insert or update on client_obligation_overrides
  for each row execute function enforce_override_period_order();

-- guard 2: overrides go on the anchor, never on a dependent template.
-- An 'after' or 'blocking_before' template inherits from the one it links to.
-- Allowing an override on both sides lets two contradicting rows exist without
-- either being wrong on its own.
create or replace function enforce_override_on_anchor_only() returns trigger
language plpgsql as $fn$
declare rel text; anchor text;
begin
  select ot.relation_type,
         (select x.name from obligation_templates x where x.id = ot.linked_template_id)
    into rel, anchor
  from obligation_templates ot
  where ot.id = new.obligation_template_id;

  if rel in ('after', 'blocking_before') then
    raise exception
      'template is dependent (%); record the override on its anchor % instead -- the dependent inherits it',
      rel, coalesce(anchor, '?');
  end if;
  return new;
end $fn$;

create trigger trg_override_on_anchor_only
  before insert or update on client_obligation_overrides
  for each row execute function enforce_override_on_anchor_only();

-- guard 3: two overrides for the same client+template may not overlap in time.
-- Overlap makes the resolved list return two answers for one obligation with
-- nothing to say which wins. An EXCLUDE constraint cannot express this, because
-- the date range lives on periods rather than on this row.
create or replace function enforce_no_overlapping_overrides() returns trigger
language plpgsql as $fn$
declare nf date; nt date; n int;
begin
  select start_date into nf from periods where id = new.valid_from_period_id;
  nt := null;
  if new.valid_to_period_id is not null then
    select end_date into nt from periods where id = new.valid_to_period_id;
  end if;

  select count(*) into n
  from client_obligation_overrides o
  join periods pf on pf.id = o.valid_from_period_id
  left join periods pt on pt.id = o.valid_to_period_id
  where o.id is distinct from new.id
    and o.client_id = new.client_id
    and o.obligation_template_id = new.obligation_template_id
    and daterange(pf.start_date, coalesce(pt.end_date, 'infinity'::date), '[]')
        && daterange(nf, coalesce(nt, 'infinity'::date), '[]');

  if n > 0 then
    raise exception 'an overlapping override already exists for this client and template';
  end if;
  return new;
end $fn$;

create trigger trg_override_no_overlap
  before insert or update on client_obligation_overrides
  for each row execute function enforce_no_overlapping_overrides();

-- Migrate the two frequency columns off clients.
--
-- These two columns ARE entity 11 in a worse shape: a per-client frequency
-- override with no validity in time, no reason, and no way to name a third
-- template. Leaving them would be two sources for one fact.
--
-- Only a client whose stored frequency DIFFERS from the template default is an
-- override; matching the default is agreement, and a sparse table records nothing.
-- Checked before writing this: of the four clients carrying a value, two do not
-- derive VAT at all (orphan values the old column happily allowed), one matches
-- the default, and one -- Rosenberg -- genuinely differs.
--
-- frequency_source for that row is inferred rather than invented: Rosenberg's
-- recorded turnover is 2,450,000 (2024) and 3,120,000 (2025), both above the
-- 1,500,000 threshold Yitzhak gave for mandatory monthly reporting. Demo data
-- either way.
--
-- annual_report_frequency_id needs no migration at all. It was populated on one
-- of six clients, with the value "annual" -- an annual report is filed annually.
-- A tautology, not information. Verified by query before dropping.
insert into client_obligation_overrides
  (client_id, obligation_template_id, applies, override_frequency_id,
   frequency_source, valid_from_period_id, reason)
select c.id,
       ot.id,
       true,
       c.vat_reporting_frequency_id,
       'turnover_derived',
       (select p.id
          from periods p
          join reporting_frequencies rf on rf.id = p.reporting_frequency_id
         where rf.months_interval = 12
           and extract(year from p.start_date) = 2024),
       'הועבר מ-clients.vat_reporting_frequency_id במיגרציה של ישות 11'
from clients c
join obligation_templates ot
  on ot.name = 'הגשת דיווח מע"מ'
where c.deleted_at is null
  and c.vat_reporting_frequency_id is not null
  and c.vat_reporting_frequency_id is distinct from ot.reporting_frequency_id
  and exists (
    select 1
    from deals d
    join deal_services ds on ds.deal_id = d.id
    join service_obligation_templates sot on sot.service_id = ds.service_id
    where d.client_id = c.id
      and d.closed_at is null
      and sot.obligation_template_id = ot.id
  );

-- active_clients froze its column list at creation, so it must be rebuilt before
-- the columns can go. See decisions/0005 and entities/active_clients.md.
drop view active_clients;

alter table clients
  drop column vat_reporting_frequency_id,
  drop column annual_report_frequency_id;

create view active_clients with (security_invoker = true) as
  select * from clients where deleted_at is null;
