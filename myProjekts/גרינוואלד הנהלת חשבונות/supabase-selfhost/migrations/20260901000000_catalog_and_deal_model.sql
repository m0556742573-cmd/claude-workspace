-- Migration: catalog deepening (what we sell and for how much) + the deal model.
-- Source of truth: docs/entities/{services,service_categories,billing_frequencies,
--   service_price_history,service_price_tiers,deals,deal_services,
--   deal_service_terms,discounts}.md
--
-- Obligation templates and their junctions are characterized but deliberately NOT
-- here: they are a separate layer ("what the service triggers") and nothing in the
-- deal model touches them. Adding them later is purely additive.
--
-- btree_gist is installed here on purpose, per Yitzhak's decision of 31/08/2026:
-- overlapping validity ranges mean two prices valid on one date, which is a silent
-- billing error. EXCLUDE constraints enforce that declaratively. Keeping the
-- create extension inside the migration is the lesson from audit finding 1 --
-- a fix applied only to the live DB does not survive a restore.

create extension if not exists btree_gist;

-- ════════════════════════════════════════════════════════
-- Lookups the catalog needs
-- ════════════════════════════════════════════════════════

create table service_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  display_order integer,
  created_at timestamptz not null default now()
);
alter table service_categories enable row level security;

-- Deliberately NOT reporting_frequencies: the state dictates when you file, the
-- firm decides when it bills. months_interval is nullable here because 'one_off'
-- and 'per_occurrence' have no cycle at all -- which is itself evidence the two
-- concepts differ in kind, not just in use.
create table billing_frequencies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  months_interval integer check (months_interval > 0),
  created_at timestamptz not null default now()
);
alter table billing_frequencies enable row level security;

-- ════════════════════════════════════════════════════════
-- services: from minimal skeleton to the actual recipe.
-- Table is empty, so NOT NULL columns need no default.
-- ════════════════════════════════════════════════════════

alter table services add column code text not null;
alter table services add constraint services_code_key unique (code);
alter table services add column service_category_id uuid references service_categories(id);

-- The load-bearing switch: it decides which machine runs when the service is
-- added to a deal. CHECK and not a lookup because each value is a different
-- machine in code -- a fifth value needs code, not a row (decisions/0006).
alter table services add column supply_type text not null
  check (supply_type in ('obligation_driven', 'quota', 'on_demand'));

alter table services add column pricing_basis text not null
  check (pricing_basis in ('flat', 'per_unit', 'hourly', 'tiered'));

alter table services add column quantity_source text
  check (quantity_source in ('payslips', 'client_employees', 'documents', 'work_hours', 'manual'));

alter table services add column default_billing_frequency_id uuid references billing_frequencies(id);
alter table services add column overage_rate numeric(10,2) check (overage_rate >= 0);
alter table services add column standard_hours numeric(6,2) check (standard_hours >= 0);

-- Without this, a "per unit" service could exist with nobody knowing units of what,
-- and the billing engine would stall silently.
alter table services add constraint services_quantity_source_matches_basis check (
  (pricing_basis = 'flat' and quantity_source is null)
  or (pricing_basis in ('per_unit', 'hourly', 'tiered') and quantity_source is not null)
);

-- An overage rate on a one-off service is meaningless and signals a data entry error.
alter table services add constraint services_overage_only_for_quota check (
  overage_rate is null or supply_type = 'quota'
);

-- ════════════════════════════════════════════════════════
-- Catalog pricing. This is the LIST price, never what a client pays --
-- that always lives on the deal, so a price update today cannot rewrite
-- what was agreed two years ago.
-- ════════════════════════════════════════════════════════

create table service_price_history (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services(id) on delete restrict,
  price numeric(10,2) not null check (price >= 0),
  valid_from date not null,
  valid_to date,
  notes text,
  created_at timestamptz not null default now(),
  constraint service_price_history_dates_ordered
    check (valid_to is null or valid_to >= valid_from),
  constraint service_price_history_no_overlap exclude using gist (
    service_id with =,
    daterange(valid_from, valid_to, '[]') with &&
  )
);
alter table service_price_history enable row level security;
create index idx_service_price_history_service on service_price_history(service_id);

-- Volume tiers -- the common way bookkeeping is priced here, confirmed by Yitzhak,
-- and absent from the original spec. A table and not columns because the number of
-- tiers is not known ahead and differs per service.
-- The EXCLUDE prevents two tiers overlapping in BOTH quantity and validity.
-- It does NOT prevent GAPS (0-50 then 60-150 leaves 55 unpriced) -- gaps cannot be
-- expressed declaratively at all, so that stays an entry-interface rule.
create table service_price_tiers (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services(id) on delete restrict,
  from_quantity numeric(12,2) not null check (from_quantity >= 0),
  to_quantity numeric(12,2),
  price numeric(10,2) not null check (price >= 0),
  valid_from date not null,
  valid_to date,
  created_at timestamptz not null default now(),
  constraint service_price_tiers_qty_ordered
    check (to_quantity is null or to_quantity > from_quantity),
  constraint service_price_tiers_dates_ordered
    check (valid_to is null or valid_to >= valid_from),
  constraint service_price_tiers_no_overlap exclude using gist (
    service_id with =,
    numrange(from_quantity, to_quantity, '[]') with &&,
    daterange(valid_from, valid_to, '[]') with &&
  )
);
alter table service_price_tiers enable row level security;
create index idx_service_price_tiers_service on service_price_tiers(service_id);

-- ════════════════════════════════════════════════════════
-- deals -- the standing account between client and firm.
-- Not an event: proposals and negotiations are business events (entity 20) and
-- will point here. Hence no status column -- the client's status already carries
-- frozen / suspended, and a second copy here would be a second source of truth.
-- ════════════════════════════════════════════════════════

create table deals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete restrict,
  opened_at date not null,
  closed_at date,
  closure_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deals_dates_ordered check (closed_at is null or closed_at >= opened_at)
);
alter table deals enable row level security;
create trigger trg_deals_updated_at before update on deals
  for each row execute function set_updated_at();
create index idx_deals_client on deals(client_id);

-- One open account per client. A client who leaves and returns gets a NEW account
-- (decided 31/08/2026) -- the old one stays closed and readable, with no false
-- continuity. This constraint supports that by itself.
create unique index idx_deals_one_open_per_client on deals(client_id) where closed_at is null;

-- ════════════════════════════════════════════════════════
-- deal_services -- what the client gets, and from when. No commercial terms.
-- The separation matters: ending a service and changing its price are different
-- events, and if a price change closed the line they would look identical.
-- ════════════════════════════════════════════════════════

create table deal_services (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete restrict,
  service_id uuid not null references services(id) on delete restrict,
  started_at date not null,
  ended_at date,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deal_services_dates_ordered check (ended_at is null or ended_at >= started_at)
);
alter table deal_services enable row level security;
create trigger trg_deal_services_updated_at before update on deal_services
  for each row execute function set_updated_at();
create index idx_deal_services_deal on deal_services(deal_id);
create index idx_deal_services_service on deal_services(service_id);

-- One ACTIVE line per service, not one line per service: a client who stopped a
-- service and resumed it six months later needs a second row, and a blanket
-- unique constraint would have blocked that history.
create unique index idx_deal_services_one_active
  on deal_services(deal_id, service_id) where is_active;

-- ════════════════════════════════════════════════════════
-- deal_service_terms -- the negotiated terms, with validity in time.
-- Price lives ONLY here. A "current" price on the line plus history in a separate
-- table would be two sources of truth needing sync.
-- ════════════════════════════════════════════════════════

create table deal_service_terms (
  id uuid primary key default gen_random_uuid(),
  deal_service_id uuid not null references deal_services(id) on delete restrict,
  agreed_price numeric(10,2) not null check (agreed_price >= 0),
  agreed_overage_rate numeric(10,2) check (agreed_overage_rate >= 0),
  quota_amount numeric(10,2) check (quota_amount > 0),
  billing_frequency_id uuid references billing_frequencies(id),
  valid_from date not null,
  valid_to date,
  reason text,
  created_by uuid references office_employees(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deal_service_terms_dates_ordered
    check (valid_to is null or valid_to >= valid_from),
  -- Two overlapping rows = two prices valid on one date = a wrong invoice.
  constraint deal_service_terms_no_overlap exclude using gist (
    deal_service_id with =,
    daterange(valid_from, valid_to, '[]') with &&
  )
);
alter table deal_service_terms enable row level security;
create trigger trg_deal_service_terms_updated_at before update on deal_service_terms
  for each row execute function set_updated_at();
create index idx_deal_service_terms_line on deal_service_terms(deal_service_id);

-- quota_amount / agreed_overage_rate only make sense for a quota service, but
-- supply_type lives on services and a CHECK cannot look at another table.
create or replace function enforce_quota_terms_match_service()
returns trigger as $fn$
declare
  st text;
begin
  select s.supply_type into st
  from deal_services ds
  join services s on s.id = ds.service_id
  where ds.id = new.deal_service_id;

  if st is distinct from 'quota'
     and (new.quota_amount is not null or new.agreed_overage_rate is not null) then
    raise exception
      'quota_amount and agreed_overage_rate are only valid for a quota service; this service has supply_type = %', st
      using hint = 'clear those fields, or point the line at a service whose supply_type is quota';
  end if;
  return new;
end;
$fn$ language plpgsql;

create trigger trg_deal_service_terms_quota_check
  before insert or update on deal_service_terms
  for each row execute function enforce_quota_terms_match_service();

-- A line with no terms is a line with no price -- broken. This must be DEFERRED:
-- the line cannot be inserted before its terms and the terms cannot be inserted
-- before the line, so the check has to happen at COMMIT, after which insert order
-- inside the transaction stops mattering.
create or replace function enforce_deal_service_has_terms()
returns trigger as $fn$
begin
  if not exists (select 1 from deal_service_terms where deal_service_id = new.id) then
    raise exception 'deal_services row % has no terms row; every line needs at least one (its price)', new.id
      using hint = 'insert the matching deal_service_terms row in the same transaction';
  end if;
  return null;
end;
$fn$ language plpgsql;

create constraint trigger trg_deal_services_must_have_terms
  after insert on deal_services
  deferrable initially deferred
  for each row execute function enforce_deal_service_has_terms();

-- ════════════════════════════════════════════════════════
-- discounts -- one mechanism, two scopes.
-- conflict_resolution is required for general discounts with no default, so an
-- undecided state cannot be saved. Yitzhak rejected a blanket "specific wins"
-- rule: it substitutes a technical default for a decision only the owner can make.
-- ════════════════════════════════════════════════════════

create table discounts (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete restrict,
  deal_service_id uuid references deal_services(id) on delete restrict,
  kind text not null check (kind in ('discount', 'benefit')),
  calculation text not null check (calculation in ('percent', 'fixed')),
  value numeric(10,2) not null check (value > 0),
  conflict_resolution text
    check (conflict_resolution in ('general_wins', 'specific_wins', 'cumulative')),
  valid_from date not null,
  valid_to date,
  reason text,
  created_by uuid references office_employees(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discounts_dates_ordered check (valid_to is null or valid_to >= valid_from),
  constraint discounts_percent_max check (calculation <> 'percent' or value <= 100),
  -- A specific discount has no conflict to resolve -- it IS the side being resolved.
  constraint discounts_conflict_only_for_general check (
    (deal_service_id is null and conflict_resolution is not null)
    or (deal_service_id is not null and conflict_resolution is null)
  )
);
alter table discounts enable row level security;
create trigger trg_discounts_updated_at before update on discounts
  for each row execute function set_updated_at();
create index idx_discounts_deal on discounts(deal_id);
create index idx_discounts_line on discounts(deal_service_id);

-- Two EXCLUDE constraints and not one: EXCLUDE ignores rows where an operand is
-- NULL, exactly like a unique constraint. A single constraint on deal_service_id
-- would have let two overlapping GENERAL discounts sit on one account unnoticed,
-- because deal_service_id is NULL in both.
alter table discounts add constraint discounts_no_overlap_specific
  exclude using gist (
    deal_service_id with =,
    daterange(valid_from, valid_to, '[]') with &&
  ) where (deal_service_id is not null);

alter table discounts add constraint discounts_no_overlap_general
  exclude using gist (
    deal_id with =,
    daterange(valid_from, valid_to, '[]') with &&
  ) where (deal_service_id is null);

-- ════════════════════════════════════════════════════════
-- Default read path for the deal model, so callers do not have to join the
-- terms history and filter dates by hand.
-- NOTE: like active_clients, the column list is frozen at creation. Any column
-- added to deal_services or deal_service_terms needs this view reissued.
-- ════════════════════════════════════════════════════════

create view deal_services_current with (security_invoker = true) as
select
  ds.id                     as deal_service_id,
  ds.deal_id,
  d.client_id,
  ds.service_id,
  ds.started_at,
  ds.notes                  as line_notes,
  t.id                      as terms_id,
  t.agreed_price,
  t.agreed_overage_rate,
  t.quota_amount,
  coalesce(t.billing_frequency_id, s.default_billing_frequency_id) as billing_frequency_id,
  t.valid_from              as terms_valid_from,
  s.supply_type,
  s.pricing_basis,
  s.quantity_source
from deal_services ds
join deals d              on d.id = ds.deal_id
join services s           on s.id = ds.service_id
join deal_service_terms t on t.deal_service_id = ds.id
where ds.is_active
  and d.closed_at is null
  and t.valid_from <= current_date
  and (t.valid_to is null or t.valid_to >= current_date);
