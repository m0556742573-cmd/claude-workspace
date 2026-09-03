-- Migration: deal_service_terms.agreed_price must be nullable for tiered services.
-- Found while seeding demo data (01/09/2026): a tiered service has no single price
-- by definition -- it is computed from service_price_tiers against actual volume
-- each billing cycle. NOT NULL on agreed_price made a tiered deal impossible to
-- represent at all. Yitzhak's decision: nullable, and ONLY nullable for tiered.
-- Source of truth: docs/entities/deal_service_terms.md, updated alongside this file.

alter table deal_service_terms alter column agreed_price drop not null;

create or replace function enforce_agreed_price_matches_pricing_basis()
returns trigger as $fn$
declare
  basis text;
begin
  select s.pricing_basis into basis
  from deal_services ds
  join services s on s.id = ds.service_id
  where ds.id = new.deal_service_id;

  if basis = 'tiered' and new.agreed_price is not null then
    raise exception
      'agreed_price must be null for a tiered service (deal_service %); the price is computed from service_price_tiers against actual volume each billing cycle, not agreed as one number',
      new.deal_service_id
      using hint = 'clear agreed_price, or point this line at a non-tiered service';
  end if;

  if basis <> 'tiered' and new.agreed_price is null then
    raise exception
      'agreed_price is required unless the service is tiered (deal_service % has pricing_basis = %)',
      new.deal_service_id, basis
      using hint = 'set agreed_price';
  end if;

  return new;
end;
$fn$ language plpgsql;

create trigger trg_deal_service_terms_price_basis_check
  before insert or update on deal_service_terms
  for each row execute function enforce_agreed_price_matches_pricing_basis();
