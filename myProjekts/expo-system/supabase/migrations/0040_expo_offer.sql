-- The expo offer and the order at the booth (יצחק, 23/10: "מציג יכול להוסיף קטלוג או מבצע… המערכת תומכת בזה"; model
-- §14א). His offer: a name, items with a regular and an expo price, and until when. At the booth, "הזמין" opens the
-- items with quantities; the order is kept with the visitor, and he is marked a deal (the exhibitor marks it, so it is
-- his own "נסגרה עסקה"). The visitor then gets a summary of his order. No payment, stock or invoice: the exhibitor's own.
alter table exhibitors add column offer jsonb check (offer is null or jsonb_typeof(offer) = 'object');
grant update (offer) on exhibitors to authenticated;
alter table leads add column booth_order jsonb check (booth_order is null or jsonb_typeof(booth_order) = 'object');

-- An order closes the lead as a deal, once: the path's queued messages are cancelled by the step's own trigger.
create function order_closes() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into lead_steps (lead_id, step_id, done_on, outcome)
  values (new.id, 'order', (now() at time zone 'Asia/Jerusalem')::date, 'closed')
  on conflict (lead_id, step_id) do nothing;
  return new;
end $$;
create trigger leads_order_closes after insert or update of booth_order on leads
  for each row when (new.booth_order is not null) execute function order_closes();
revoke execute on function order_closes() from public, anon, authenticated;
