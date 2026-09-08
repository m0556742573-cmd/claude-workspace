-- Migration: obligation templates -- the layer that says what a service triggers.
--
-- This is what turns the catalog from a price list into a recipe. Until now a
-- service could be sold but could not cause anything; service_obligation_templates
-- closes that gap. Full chain, now complete in code:
--   client -> deal -> services -> obligation templates -> filtered by entity type
--
-- Characterized 31/08/2026, built unchanged. Source of truth:
--   docs/entities/{obligation_templates,authorities,service_obligation_templates,
--                  obligation_template_entity_types}.md
--
-- One deliberate tightening beyond the characterization: authority_id is NOT NULL.
-- The doc left it unmarked, but an obligation filed to nobody is not an obligation --
-- internal work with no authority is a task, which we decided is a separate table.

-- ════════════════════════════════════════════════════════
-- authorities -- work in this office is organised by authority, not by client:
-- "what is due to VAT by the 15th" is the question actually asked.
-- ════════════════════════════════════════════════════════

create table authorities (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  website text,
  created_at timestamptz not null default now()
);
alter table authorities enable row level security;

-- ════════════════════════════════════════════════════════
-- obligation_templates -- the rule. The instance (entity 10) is
-- template x period x client, and carries status/assignee/actual dates.
-- ════════════════════════════════════════════════════════

create table obligation_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  authority_id uuid not null references authorities(id) on delete restrict,

  -- The merge of the original two entities (submission template + payment template).
  action_type text not null check (action_type in ('submission', 'payment')),

  -- The window ONLY. The deadline rule lives in the two columns below, because a
  -- frequency shared by two obligations must not generate duplicate periods.
  reporting_frequency_id uuid not null references reporting_frequencies(id) on delete restrict,
  due_month_offset integer not null check (due_month_offset >= 0),
  due_day_of_month integer not null check (due_day_of_month between 1 and 31),

  relation_type text not null
    check (relation_type in ('independent', 'after', 'embedded', 'blocking_before')),
  linked_template_id uuid references obligation_templates(id) on delete restrict,

  requires_payroll_run boolean not null default false,

  -- No default, on purpose: an undecided state must not be saveable. See the
  -- deferred trigger below for the other half of the enforcement.
  applies_to_all_entity_types boolean not null,

  allows_amendments boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Without this, an "after" template could exist with nobody knowing after what.
  constraint obligation_templates_link_matches_relation check (
    (relation_type in ('independent', 'embedded') and linked_template_id is null)
    or (relation_type in ('after', 'blocking_before') and linked_template_id is not null)
  ),
  constraint obligation_templates_no_self_link
    check (linked_template_id is distinct from id)
);
alter table obligation_templates enable row level security;
create trigger trg_obligation_templates_updated_at before update on obligation_templates
  for each row execute function set_updated_at();
create index idx_obligation_templates_authority on obligation_templates(authority_id);
create index idx_obligation_templates_frequency on obligation_templates(reporting_frequency_id);
create index idx_obligation_templates_linked on obligation_templates(linked_template_id);

-- ════════════════════════════════════════════════════════
-- service_obligation_templates -- the junction that makes the catalog a recipe.
-- restrict and not cascade: this is not a pure join table, it carries operational
-- knowledge set once. Deleting a service and silently taking its obligation
-- definitions with it is exactly the loss that is hard to reconstruct.
-- ════════════════════════════════════════════════════════

create table service_obligation_templates (
  service_id uuid not null references services(id) on delete restrict,
  obligation_template_id uuid not null references obligation_templates(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (service_id, obligation_template_id)
);
alter table service_obligation_templates enable row level security;
create index idx_service_obligation_templates_template
  on service_obligation_templates(obligation_template_id);

-- ════════════════════════════════════════════════════════
-- obligation_template_entity_types -- the regulatory safety net. An exempt dealer
-- who buys bookkeeping must not be handed a periodic VAT obligation: that filter
-- is a regulatory fact, not a commercial choice, so it sits on the template and
-- applies however the firm chooses to package its services.
-- ════════════════════════════════════════════════════════

create table obligation_template_entity_types (
  obligation_template_id uuid not null references obligation_templates(id) on delete restrict,
  entity_type_id uuid not null references entity_types(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (obligation_template_id, entity_type_id)
);
alter table obligation_template_entity_types enable row level security;
create index idx_obligation_template_entity_types_entity_type
  on obligation_template_entity_types(entity_type_id);

-- ════════════════════════════════════════════════════════
-- Enforcement that a CHECK cannot express
-- ════════════════════════════════════════════════════════

-- Only the DEPENDENT template holds the link. That rule prevents A -> B -> A by
-- definition, but does not enforce it -- and a mutual link puts the blocking
-- engine in a loop.
create or replace function enforce_no_mutual_template_link()
returns trigger as $fn$
declare
  other_link uuid;
begin
  if new.linked_template_id is null then
    return new;
  end if;

  select linked_template_id into other_link
  from obligation_templates where id = new.linked_template_id;

  if other_link = new.id then
    raise exception
      'obligation templates % and % would point at each other; only the dependent template holds the link',
      new.id, new.linked_template_id
      using hint = 'clear linked_template_id on whichever side is not the dependent half';
  end if;

  return new;
end;
$fn$ language plpgsql;

create trigger trg_obligation_templates_no_mutual_link
  before insert or update on obligation_templates
  for each row execute function enforce_no_mutual_template_link();

-- A template marked "does not apply to all entity types" that lists none applies
-- to nobody -- it would silently generate nothing. A CHECK cannot count rows in
-- another table, so this is a DEFERRED constraint trigger checked at COMMIT:
-- the template cannot be inserted before its rows and the rows cannot be inserted
-- before the template, so insert order inside the transaction must stop mattering.
create or replace function check_template_entity_scope(p_template_id uuid)
returns void as $fn$
declare
  applies_all boolean;
begin
  select applies_to_all_entity_types into applies_all
  from obligation_templates where id = p_template_id;

  -- The template itself may have been deleted in this transaction; nothing to check.
  if applies_all is null then
    return;
  end if;

  if applies_all = false
     and not exists (select 1 from obligation_template_entity_types
                     where obligation_template_id = p_template_id) then
    raise exception
      'obligation template % is marked as not applying to all entity types, but lists none',
      p_template_id
      using hint = 'add obligation_template_entity_types rows, or set applies_to_all_entity_types = true';
  end if;
end;
$fn$ language plpgsql;

create or replace function enforce_entity_scope_on_template()
returns trigger as $fn$
begin
  perform check_template_entity_scope(new.id);
  return null;
end;
$fn$ language plpgsql;

create constraint trigger trg_obligation_templates_entity_scope
  after insert or update on obligation_templates
  deferrable initially deferred
  for each row execute function enforce_entity_scope_on_template();

-- The same rule can also be broken from the other side, by removing the last
-- entity-type row from a template that needs one.
create or replace function enforce_entity_scope_on_junction()
returns trigger as $fn$
begin
  perform check_template_entity_scope(old.obligation_template_id);
  return null;
end;
$fn$ language plpgsql;

create constraint trigger trg_obligation_template_entity_types_scope
  after delete on obligation_template_entity_types
  deferrable initially deferred
  for each row execute function enforce_entity_scope_on_junction();
