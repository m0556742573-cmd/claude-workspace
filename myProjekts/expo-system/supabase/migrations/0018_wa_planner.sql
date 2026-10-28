-- 0018: WhatsApp step 2b — the messages a path sends on its own (who = auto), planned on the WhatsApp server by the
-- same engine the app runs, and sent through the same limits (wa-server/limits.ts). The first one goes right after the
-- visit (יצחק 16/10: "נשלחת מיד, או לא בכלל"), once the card has settled for a few minutes, so a tap taken back at the
-- booth does not send the wrong message. A sent step is recorded on the lead, so the path moves on by itself.

-- Which step of the path a queued message is. One message per step per lead.
alter table outbox add column step_id text;
create index outbox_lead_step on outbox (lead_id, step_id) where step_id is not null;

-- When a lead last changed (a tap at the booth): the planner waits until the card has settled.
alter table leads add column updated_at timestamptz not null default now();
create function touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
create trigger leads_touch before update on leads for each row execute function touch_updated_at();

-- Everything the planner needs for one exhibitor, in one call: his signature, his setups and texts, his leads (without
-- those who asked to be removed), what was done, what he set by hand, the replies, and what is already planned.
create function wa_plan(key text, exhibitor uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  return jsonb_build_object(
    'me', (select jsonb_build_object('name', e.name, 'business', e.business, 'phone', e.phone, 'greeting', coalesce(e.greeting, 'shalom'),
             'sensitive', e.sensitive, 'blocked', e.wa_blocked_at is not null) from exhibitors e where e.id = exhibitor),
    'setups', (select coalesce(jsonb_agg(jsonb_build_object('version', s.version, 'active', s.active, 'data', s.data)), '[]'::jsonb)
               from setups s where s.exhibitor_id = exhibitor),
    'texts', (select coalesce(jsonb_object_agg(t.id, t.body), '{}'::jsonb) from message_templates t where t.exhibitor_id = exhibitor),
    'leads', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', l.id, 'captured_on', l.captured_on, 'taps', l.taps, 'customer_date', l.customer_date,
                'business_owner', coalesce(p.business_owner, false), 'setup_version', l.setup_version,
                'name', coalesce(l.typed_name, p.full_name), 'has_phone', phone_key(coalesce(p.phone, l.typed_phone)) is not null,
                'has_whatsapp', p.has_whatsapp, 'settled', l.updated_at < now() - interval '3 minutes')), '[]'::jsonb)
              from leads l left join people p on p.id = l.person_id
              where l.exhibitor_id = exhibitor and not l.opted_out
                and not exists (select 1 from opt_outs x where (x.exhibitor_id = l.exhibitor_id or x.exhibitor_id is null)
                  and x.phone is not null and phone_key(x.phone) = phone_key(coalesce(p.phone, l.typed_phone)))),
    'steps', (select coalesce(jsonb_agg(jsonb_build_object('lead_id', s.lead_id, 'step_id', s.step_id, 'done_on', s.done_on, 'outcome', s.outcome) order by s.created_at), '[]'::jsonb)
              from lead_steps s join leads l on l.id = s.lead_id where l.exhibitor_id = exhibitor),
    'manual', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'lead_id', m.lead_id, 'action', m.action, 'who', m.who, 'due_on', m.due_on, 'message', m.message)), '[]'::jsonb)
               from manual_steps m where m.exhibitor_id = exhibitor),
    'replies', (select coalesce(jsonb_agg(jsonb_build_object('lead_id', r.lead_id, 'at', r.at, 'optout', r.optout) order by r.at), '[]'::jsonb)
                from lead_replies r where r.exhibitor_id = exhibitor),
    'planned', (select coalesce(jsonb_agg(o.lead_id::text || '|' || o.step_id), '[]'::jsonb)
                from outbox o where o.exhibitor_id = exhibitor and o.step_id is not null and o.status in ('queued', 'sending', 'sent', 'failed'))
  );
end $$;

-- Queue one step's message. Never twice for the same step.
create function wa_plan_queue(key text, lead uuid, step text, template text, body text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  if exists (select 1 from outbox o where o.lead_id = lead and o.step_id = step and o.status in ('queued', 'sending', 'sent', 'failed')) then return false; end if;
  insert into outbox (exhibitor_id, lead_id, channel, template_id, body, status, step_id)
  select l.exhibitor_id, l.id, 'whatsapp', template, body, 'queued', step from leads l where l.id = lead;
  return found;
end $$;

-- A sent step is recorded on the lead (done today, Israel time), so the path moves on.
create or replace function wa_result(key text, item uuid, ok boolean, err text default null, first boolean default null)
returns void language plpgsql security definer set search_path = public as $$
declare pid uuid; lid uuid; sid text;
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  update outbox set status = case when ok then 'sent' else 'failed' end, sent_at = case when ok then now() end,
    error = err, first_contact = first
  where id = item and status = 'queued'
  returning lead_id, step_id into lid, sid;
  if ok and sid is not null then
    insert into lead_steps (lead_id, step_id, done_on, outcome)
    values (lid, sid, (now() at time zone 'Asia/Jerusalem')::date, 'noAnswer') on conflict (lead_id, step_id) do nothing;
  end if;
  select l.person_id into pid from outbox o join leads l on l.id = o.lead_id where o.id = item;
  if pid is not null and (ok or err = 'no_whatsapp') then update people set has_whatsapp = ok where id = pid; end if;
end $$;

-- What the exhibitor marks (a deal, not relevant, remove me, or he answered) cancels whatever the path still had queued.
create function cancel_planned() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.outcome in ('engaged', 'closed', 'notRelevant', 'optOut') then
    update outbox set status = 'cancelled', error = 'lead_moved_on' where lead_id = new.lead_id and step_id is not null and status = 'queued';
  end if;
  return new;
end $$;
create trigger lead_steps_cancel after insert on lead_steps for each row execute function cancel_planned();

-- A reply cancels the path's queued messages too: he answers the person first (model §9).
create or replace function wa_inbound(key text, exhibitor uuid, phone text, body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare lid uuid; raw text; is_out boolean;
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  if not coalesce((select wa_read_replies from exhibitors where id = exhibitor), false) then return null; end if;
  select l.id, coalesce(p.phone, l.typed_phone) into lid, raw
  from leads l left join people p on p.id = l.person_id
  where l.exhibitor_id = exhibitor and phone_key(coalesce(p.phone, l.typed_phone)) = phone_key(phone)
  order by l.captured_at desc limit 1;
  if lid is null then return null; end if;
  is_out := btrim(body) ~* '^(הסר|הסירו|להסיר|הסרה|תסירו|stop)[.!\s]*$';
  insert into lead_replies (exhibitor_id, lead_id, body, optout) values (exhibitor, lid, left(body, 2000), is_out);
  update outbox set status = 'cancelled', error = 'replied' where lead_id = lid and step_id is not null and status = 'queued';
  if is_out then
    insert into opt_outs (exhibitor_id, phone) values (exhibitor, raw);
    update leads set opted_out = true where id = lid;
  end if;
  return lid;
end $$;

revoke all on function wa_plan(text, uuid), wa_plan_queue(text, uuid, text, text, text), touch_updated_at(), cancel_planned() from public, anon, authenticated;
grant execute on function wa_plan(text, uuid), wa_plan_queue(text, uuid, text, text, text) to anon;
revoke all on function wa_result(text, uuid, boolean, text, boolean), wa_inbound(text, uuid, text, text) from public, authenticated;
grant execute on function wa_result(text, uuid, boolean, text, boolean), wa_inbound(text, uuid, text, text) to anon;
