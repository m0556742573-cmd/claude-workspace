-- One visitor, one message (30/10, from the full review):
-- - Registered twice at the same booth on the same day (two tablets, or the tablet's copy and his own self-registration
--   before the tablet uploaded): the path's messages go to the first of the two only.
-- - His own mail is held back while it is not known whether his own number has WhatsApp; if the WhatsApp message then
--   finds it has none, the same step goes to his mail. Before, a visitor not yet checked got both.

-- The leads the planner sees: without a later twin of one already registered that day.
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

-- Queueing a path's step: his own mail waits while it is not known whether his own number has WhatsApp.
create or replace function wa_plan_queue(key text, lead uuid, step text, template text, body text, wa boolean default true, mail boolean default false,
  files text[] default null, fast_day date default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare tr boolean; pre text := '';
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  select l.practice into tr from leads l where l.id = lead;
  if tr is null then return false; end if;
  if tr then
    if current_phase() <> 'practice' or not trial_lead(lead) then return false; end if;
    pre := trial_prefix(lead);
  elsif current_phase() not in ('live', 'after') then return false;
  end if;
  if exists (select 1 from outbox o where o.lead_id = lead and o.step_id = step and o.status in ('queued', 'sending', 'sent', 'failed')) then return false; end if;
  insert into outbox (exhibitor_id, lead_id, channel, template_id, body, status, step_id, to_phone, to_email, files, trial, virtual_on)
  select l.exhibitor_id, l.id, 'whatsapp', template, pre || body, 'queued', step, t.to_phone, null::text, files, tr, case when tr then fast_day end
  from leads l cross join lateral wa_targets(l.id) t where wa and l.id = lead
  union all
  select l.exhibitor_id, l.id, 'email', template, pre || body, 'queued', step, null::text, m.to_email, files, tr, case when tr then fast_day end
  from leads l cross join lateral mail_targets(l.id) m cross join lateral lead_own(l.id) own
  where mail and l.id = lead
    and not (wa and not tr and m.to_email = own.email and own.wa is null and coalesce(l.own_phone_on, true) and own.phone is not null);
  return found;
end $$;

-- A WhatsApp result: as before, and when his own number turns out to have no WhatsApp, the step goes to his own mail.
create or replace function wa_result(key text, item uuid, ok boolean, err text default null, first boolean default null)
returns void language plpgsql security definer set search_path = public as $$
declare lid uuid; sid text; dest text; pid uuid; listed boolean; vday date; tr boolean;
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  update outbox set status = case when ok then 'sent' else 'failed' end, sent_at = case when ok then now() end,
    error = err, first_contact = first
  where id = item and status = 'queued'
  returning lead_id, step_id, to_phone, virtual_on, trial into lid, sid, dest, vday, tr;
  if lid is null then return; end if;
  if ok and sid is not null then
    insert into lead_steps (lead_id, step_id, done_on, outcome, virtual_on)
    values (lid, sid, (now() at time zone 'Asia/Jerusalem')::date, 'noAnswer', vday) on conflict (lead_id, step_id) do nothing;
  end if;
  -- A trial send went to the exhibitor, not to the visitor: it teaches nothing about the visitor's WhatsApp.
  if tr or not (ok or err = 'no_whatsapp') then return; end if;
  if dest is not null then
    update lead_contacts set has_whatsapp = ok where lead_id = lid and kind = 'phone' and value = dest;
  else
    select l.person_id, p.phone is not null into pid, listed from leads l left join people p on p.id = l.person_id where l.id = lid;
    if listed then update people set has_whatsapp = ok where id = pid;
    else update leads set typed_whatsapp = ok where id = lid; end if;
    if not ok and sid is not null then
      insert into outbox (exhibitor_id, lead_id, channel, template_id, body, status, step_id, to_email, files, trial, virtual_on)
      select o.exhibitor_id, o.lead_id, 'email', o.template_id, o.body, 'queued', o.step_id, m.to_email, o.files, o.trial, o.virtual_on
      from outbox o cross join lateral mail_targets(o.lead_id) m
      where o.id = item and m.to_email = (select x.email from lead_own(o.lead_id) x)
        and not exists (select 1 from outbox y where y.lead_id = o.lead_id and y.step_id = o.step_id and y.channel = 'email' and y.to_email = m.to_email);
    end if;
  end if;
end $$;
