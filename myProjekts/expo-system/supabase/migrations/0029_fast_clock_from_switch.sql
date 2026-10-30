-- The trial's fast clock counts from the moment he switched it on (יצחק, 30/10), not from each visitor's registration.
-- Counted from registration, a visitor registered half a day earlier was already 700 "days" into his path, so one
-- message went and the rest were long overdue. Now every trial visitor starts his path when the switch goes on (or
-- when he registers, if later), and a trial step done on an earlier run counts on its real day, not its old fast one.
alter table exhibitors add column trial_fast_since timestamptz;

create function trial_fast_mark() returns trigger language plpgsql as $$
begin
  new.trial_fast_since := case when new.trial_fast then now() end;
  return new;
end $$;
create trigger trial_fast_mark before update of trial_fast on exhibitors
  for each row when (new.trial_fast is distinct from old.trial_fast) execute function trial_fast_mark();

-- A booth whose clock is already running starts again from now.
update exhibitors set trial_fast_since = now() where trial_fast;

create or replace function wa_plan(key text, exhibitor uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare since timestamptz;
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  select case when e.trial_fast and current_phase() = 'practice' then e.trial_fast_since end into since from exhibitors e where e.id = exhibitor;
  return jsonb_build_object(
    'me', (select jsonb_build_object('name', e.name, 'business', e.business, 'phone', e.phone, 'greeting', coalesce(e.greeting, 'shalom'),
             'sensitive', e.sensitive, 'blocked', e.wa_blocked_at is not null, 'fills', e.fills) from exhibitors e where e.id = exhibitor),
    'setups', (select coalesce(jsonb_agg(jsonb_build_object('version', s.version, 'active', s.active, 'data', s.data)), '[]'::jsonb)
               from setups s where s.exhibitor_id = exhibitor),
    'texts', (select coalesce(jsonb_object_agg(t.id, t.body), '{}'::jsonb) from message_templates t where t.exhibitor_id = exhibitor),
    'leads', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', l.id, 'captured_on', l.captured_on,
                'captured_at', case when since is not null and l.practice then greatest(l.captured_at, since) else l.captured_at end,
                'taps', l.taps, 'customer_date', l.customer_date,
                'business_owner', coalesce(p.business_owner, false), 'setup_version', l.setup_version,
                'name', coalesce(l.typed_name, p.full_name),
                'targets', (select count(*) from wa_targets(l.id)), 'mails', (select count(*) from mail_targets(l.id)),
                'settled', l.updated_at < now() - interval '3 minutes',
                'booth_message', l.booth_message, 'booth_none', l.booth_none)), '[]'::jsonb)
              from leads l left join people p on p.id = l.person_id
              where l.exhibitor_id = exhibitor and not l.opted_out
                and case when current_phase() = 'practice' then trial_lead(l.id) else not l.practice end
                and not exists (select 1 from opt_outs x where (x.exhibitor_id = l.exhibitor_id or x.exhibitor_id is null)
                  and x.phone is not null and phone_key(x.phone) = phone_key(coalesce(p.phone, l.typed_phone)))),
    'steps', (select coalesce(jsonb_agg(jsonb_build_object('lead_id', s.lead_id, 'step_id', s.step_id, 'done_on', s.done_on,
                'virtual_on', case when since is not null and s.created_at < since then null else s.virtual_on end,
                'outcome', s.outcome) order by s.created_at), '[]'::jsonb)
              from lead_steps s join leads l on l.id = s.lead_id where l.exhibitor_id = exhibitor),
    'manual', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'lead_id', m.lead_id, 'action', m.action, 'who', m.who, 'due_on', m.due_on, 'message', m.message)), '[]'::jsonb)
               from manual_steps m where m.exhibitor_id = exhibitor),
    'replies', (select coalesce(jsonb_agg(jsonb_build_object('lead_id', r.lead_id, 'at', r.at, 'optout', r.optout) order by r.at), '[]'::jsonb)
                from lead_replies r where r.exhibitor_id = exhibitor),
    'planned', (select coalesce(jsonb_agg(o.lead_id::text || '|' || o.step_id), '[]'::jsonb)
                from outbox o where o.exhibitor_id = exhibitor and o.step_id is not null and o.status in ('queued', 'sending', 'sent', 'failed'))
  );
end $$;
