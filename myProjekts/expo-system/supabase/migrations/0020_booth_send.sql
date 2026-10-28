-- 0020: sending from the booth (יצחק, 28/10). The paths send by themselves; the card shows what will go and lets him
-- choose instead: another message, none now, or (behind "לשנות") another number, as when a visitor asks that it go to
-- his wife. The choice lives on the lead, so it is made offline too and goes up with the card. The exhibitor's default
-- message for the booth (17/10) is one tap when the path has no immediate message.

alter table leads
  add column booth_message text,                         -- the message he chose at the booth
  add column booth_none boolean not null default false,  -- he chose: no message now
  add column booth_to text;                              -- another number for the booth message
alter table exhibitors add column booth_default text;    -- the booth's default message, or none
alter table outbox add column to_phone text;             -- a number other than the visitor's own

create or replace function wa_plan(key text, exhibitor uuid) returns jsonb
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
                'has_whatsapp', p.has_whatsapp, 'settled', l.updated_at < now() - interval '3 minutes',
                'booth_message', l.booth_message, 'booth_none', l.booth_none, 'booth_to', phone_key(l.booth_to))), '[]'::jsonb)
              from leads l left join people p on p.id = l.person_id
              where l.exhibitor_id = exhibitor and not l.opted_out and not l.practice
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

drop function wa_plan_queue(text, uuid, text, text, text);
create function wa_plan_queue(key text, lead uuid, step text, template text, body text, to_phone text default null) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  if current_phase() <> 'live' then return false; end if;
  if exists (select 1 from outbox o where o.lead_id = lead and o.step_id = step and o.status in ('queued', 'sending', 'sent', 'failed')) then return false; end if;
  insert into outbox (exhibitor_id, lead_id, channel, template_id, body, status, step_id, to_phone)
  select l.exhibitor_id, l.id, 'whatsapp', template, body, 'queued', step, to_phone from leads l where l.id = lead and not l.practice;
  return found;
end $$;

create or replace function wa_queue(key text, max_rows int default 50)
returns table (id uuid, exhibitor_id uuid, lead_id uuid, body text, phone text, name text, first_contact boolean, save_contact boolean, first_today int)
language plpgsql security definer set search_path = public as $$
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  if current_phase() <> 'live' then return; end if;
  update outbox o set status = 'cancelled', error = 'opted_out'
  from leads l left join people p on p.id = l.person_id
  where o.lead_id = l.id and o.status = 'queued' and o.channel = 'whatsapp'
    and (l.opted_out or exists (
      select 1 from opt_outs x where (x.exhibitor_id = l.exhibitor_id or x.exhibitor_id is null)
        and x.phone is not null and phone_key(x.phone) = phone_key(coalesce(p.phone, l.typed_phone))));
  return query
  select o.id, o.exhibitor_id, o.lead_id, o.body, coalesce(phone_key(o.to_phone), phone_key(coalesce(p.phone, l.typed_phone))),
    coalesce(l.typed_name, p.full_name),
    not exists (select 1 from lead_replies r where r.lead_id = o.lead_id),
    e.wa_save_contacts and o.to_phone is null,
    (select count(*)::int from outbox s where s.exhibitor_id = o.exhibitor_id and s.channel = 'whatsapp' and s.status = 'sent'
       and s.first_contact and s.sent_at >= (date_trunc('day', now() at time zone 'Asia/Jerusalem') at time zone 'Asia/Jerusalem'))
  from outbox o
  join leads l on l.id = o.lead_id
  left join people p on p.id = l.person_id
  join exhibitors e on e.id = o.exhibitor_id
  where o.status = 'queued' and o.channel = 'whatsapp' and (o.not_before is null or o.not_before <= now()) and e.wa_blocked_at is null
    and not l.practice
  order by o.created_at
  limit max_rows;
end $$;

revoke all on function wa_plan(text, uuid), wa_plan_queue(text, uuid, text, text, text, text), wa_queue(text, int) from public, authenticated;
grant execute on function wa_plan(text, uuid), wa_plan_queue(text, uuid, text, text, text, text), wa_queue(text, int) to anon;
