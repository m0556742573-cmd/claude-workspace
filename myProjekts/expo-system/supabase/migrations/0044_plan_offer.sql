-- 0044: the planner gets the exhibitor's expo offer (1/11, model §14א; my choice, his "no preference"): a visitor who did
-- not order gets it the day after his visit, on a day the path sends him nothing, and a reminder the day before it ends;
-- a week after an order, a check that it arrived. The steps are x:offer, x:offer-reminder, x:order-check; the engine
-- leaves x: steps out of the path's dates. The exhibitor can keep the offer at the booth only (offer.send = false).
create or replace function wa_plan(key text, exhibitor uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare since timestamptz;
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  select case when e.trial_fast and current_phase() = 'practice' then e.trial_fast_since end into since from exhibitors e where e.id = exhibitor;
  return jsonb_build_object(
    'me', (select jsonb_build_object('name', e.name, 'business', e.business, 'phone', e.phone, 'greeting', coalesce(e.greeting, 'shalom'),
             'sensitive', e.sensitive, 'blocked', e.wa_blocked_at is not null, 'fills', e.fills,
             'whatsapp', nullif(btrim(e.whatsapp), '')) from exhibitors e where e.id = exhibitor),
    'setups', (select coalesce(jsonb_agg(jsonb_build_object('version', s.version, 'active', s.active, 'data', s.data)), '[]'::jsonb)
               from setups s where s.exhibitor_id = exhibitor),
    'texts', (select coalesce(jsonb_object_agg(t.id, t.body), '{}'::jsonb) from message_templates t where t.exhibitor_id = exhibitor),
    'offer', (select e.offer from exhibitors e where e.id = exhibitor),
    'leads', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', l.id, 'captured_on', l.captured_on,
                'captured_at', case when since is not null and l.practice then greatest(l.captured_at, since) else l.captured_at end,
                'taps', l.taps, 'customer_date', l.customer_date,
                'business_owner', coalesce(p.business_owner, false), 'setup_version', l.setup_version,
                'name', coalesce(l.typed_name, p.full_name),
                'targets', (select count(*) from wa_targets(l.id)), 'mails', (select count(*) from mail_targets(l.id)),
                'settled', l.updated_at < now() - interval '3 minutes',
                'booth_message', l.booth_message, 'booth_none', l.booth_none, 'booth_order', l.booth_order)), '[]'::jsonb)
              from leads l left join people p on p.id = l.person_id
              where l.exhibitor_id = exhibitor and not l.opted_out
                and case when current_phase() = 'practice' then trial_lead(l.id) else not l.practice end
                and not exists (select 1 from opt_outs x where (x.exhibitor_id = l.exhibitor_id or x.exhibitor_id is null)
                  and x.phone is not null and phone_key(x.phone) = phone_key(coalesce(p.phone, l.typed_phone)))
                and not exists (select 1 from leads d left join people dp on dp.id = d.person_id
                  where d.exhibitor_id = l.exhibitor_id and d.captured_on = l.captured_on and d.practice = l.practice
                    and (d.captured_at, d.id) < (l.captured_at, l.id)
                    and ((l.person_id is not null and d.person_id = l.person_id)
                      or phone_key(coalesce(dp.phone, d.typed_phone)) = phone_key(coalesce(p.phone, l.typed_phone))))),
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
