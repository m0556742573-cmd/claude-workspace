-- 0024: mail goes out by itself (29/10), like WhatsApp: the path's own messages, on their day, to every mail of the lead
-- that receives (his own mail when his phone gets no WhatsApp, or always if the exhibitor chose so; and mails added).
-- From the exhibitor's name at expo.y-h-m.com, replies to the exhibitor's own mail, and a removal link in each. The sender
-- is the server on the VPS, through the provider set there (Amazon SES or Cloudflare: his choice, still open), within the
-- same hours as WhatsApp. Planning no longer needs a linked WhatsApp: a booth with mail only is planned too.

alter table outbox add column to_email text;

-- Where a lead's mail goes: the same rule his page shows (lead_destinations), without the ones that asked to be removed.
create function mail_targets(lead uuid) returns table (to_email text)
language sql stable security definer set search_path = public as $$
  with me as (
    select l.id, l.exhibitor_id, l.own_phone_on, l.own_email_on, o.phone, o.email, o.wa, e.mail_always
    from leads l cross join lateral lead_own(l.id) o join exhibitors e on e.id = l.exhibitor_id where l.id = lead
  )
  select me.email from me
  where me.email is not null
    and coalesce(me.own_email_on, me.mail_always or not (coalesce(me.own_phone_on, true) and me.phone is not null and coalesce(me.wa, false)))
    and not exists (select 1 from opt_outs x where (x.exhibitor_id = me.exhibitor_id or x.exhibitor_id is null) and lower(x.email) = me.email)
  union
  select c.value from lead_contacts c join me on me.id = c.lead_id
  where c.kind = 'email' and c.receives
    and not exists (select 1 from opt_outs x where (x.exhibitor_id = me.exhibitor_id or x.exhibitor_id is null) and lower(x.email) = c.value)
$$;

-- The booths to plan: every approved one, in live only (with or without WhatsApp; mail may carry the path alone).
create function plan_exhibitors(key text) returns table (id uuid)
language plpgsql stable security definer set search_path = public as $$
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  if current_phase() <> 'live' then return; end if;
  return query select e.id from exhibitors e where e.approved;
end $$;

-- The planner's view, now with how many mails each lead has.
create or replace function wa_plan(key text, exhibitor uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  return jsonb_build_object(
    'me', (select jsonb_build_object('name', e.name, 'business', e.business, 'phone', e.phone, 'greeting', coalesce(e.greeting, 'shalom'),
             'sensitive', e.sensitive, 'blocked', e.wa_blocked_at is not null, 'fills', e.fills) from exhibitors e where e.id = exhibitor),
    'setups', (select coalesce(jsonb_agg(jsonb_build_object('version', s.version, 'active', s.active, 'data', s.data)), '[]'::jsonb)
               from setups s where s.exhibitor_id = exhibitor),
    'texts', (select coalesce(jsonb_object_agg(t.id, t.body), '{}'::jsonb) from message_templates t where t.exhibitor_id = exhibitor),
    'leads', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', l.id, 'captured_on', l.captured_on, 'taps', l.taps, 'customer_date', l.customer_date,
                'business_owner', coalesce(p.business_owner, false), 'setup_version', l.setup_version,
                'name', coalesce(l.typed_name, p.full_name),
                'targets', (select count(*) from wa_targets(l.id)), 'mails', (select count(*) from mail_targets(l.id)),
                'settled', l.updated_at < now() - interval '3 minutes',
                'booth_message', l.booth_message, 'booth_none', l.booth_none)), '[]'::jsonb)
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

-- A step is queued once: by WhatsApp to each number that gets it (when his WhatsApp is linked), and by mail to each
-- mail that receives (when mail is set on the server).
drop function wa_plan_queue(text, uuid, text, text, text);
create function wa_plan_queue(key text, lead uuid, step text, template text, body text, wa boolean default true, mail boolean default false)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  if current_phase() <> 'live' then return false; end if;
  if exists (select 1 from outbox o where o.lead_id = lead and o.step_id = step and o.status in ('queued', 'sending', 'sent', 'failed')) then return false; end if;
  insert into outbox (exhibitor_id, lead_id, channel, template_id, body, status, step_id, to_phone, to_email)
  select l.exhibitor_id, l.id, 'whatsapp', template, body, 'queued', step, t.to_phone, null::text
  from leads l cross join lateral wa_targets(l.id) t where wa and l.id = lead and not l.practice
  union all
  select l.exhibitor_id, l.id, 'email', template, body, 'queued', step, null::text, m.to_email
  from leads l cross join lateral mail_targets(l.id) m where mail and l.id = lead and not l.practice;
  return found;
end $$;

-- The mail queue: what to send, in whose name, and where a reply goes. Whoever was removed meanwhile is cancelled.
create function mail_queue(key text, max_rows int default 50)
returns table (id uuid, to_email text, body text, from_name text, reply_to text, subject text)
language plpgsql security definer set search_path = public as $$
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  if current_phase() <> 'live' then return; end if;
  update outbox o set status = 'cancelled', error = 'opted_out'
  from leads l
  where o.lead_id = l.id and o.status = 'queued' and o.channel = 'email'
    and (l.opted_out or exists (select 1 from opt_outs x where (x.exhibitor_id = l.exhibitor_id or x.exhibitor_id is null) and lower(x.email) = lower(o.to_email)));
  return query
  select o.id, o.to_email, o.body, e.name, nullif(btrim(e.email), ''),
    -- a sensitive business signs with a name only, in the subject too (as on the app's mail button)
    case when e.sensitive or coalesce((select (s.data->>'sensitive')::boolean from setups s where s.exhibitor_id = e.id and s.active limit 1), false)
      then e.name else coalesce(nullif(btrim(e.business), ''), e.name) end
  from outbox o join leads l on l.id = o.lead_id join exhibitors e on e.id = o.exhibitor_id
  where o.status = 'queued' and o.channel = 'email' and o.to_email is not null and (o.not_before is null or o.not_before <= now()) and not l.practice
  order by o.created_at
  limit max_rows;
end $$;

-- A mail sent: the step is done on the lead, so the path moves on (as with WhatsApp).
create function mail_result(key text, item uuid, ok boolean, err text default null) returns void
language plpgsql security definer set search_path = public as $$
declare lid uuid; sid text;
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  update outbox set status = case when ok then 'sent' else 'failed' end, sent_at = case when ok then now() end, error = err
  where id = item and status = 'queued' and channel = 'email'
  returning lead_id, step_id into lid, sid;
  if ok and sid is not null then
    insert into lead_steps (lead_id, step_id, done_on, outcome)
    values (lid, sid, (now() at time zone 'Asia/Jerusalem')::date, 'noAnswer') on conflict (lead_id, step_id) do nothing;
  end if;
end $$;

-- The removal link in every mail: whom it removes, and the removal itself. It removes him from that exhibitor's
-- messages altogether ("הסר" from any destination stops everything, 29/10), and it shows in his page as a request.
create function mail_unsub_info(key text, item uuid) returns table (email text, booth text, removed boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  return query
  select o.to_email, case when e.sensitive then e.name else coalesce(nullif(btrim(e.business), ''), e.name) end, l.opted_out
  from outbox o join leads l on l.id = o.lead_id join exhibitors e on e.id = o.exhibitor_id
  where o.id = item and o.channel = 'email';
end $$;

create function mail_unsubscribe(key text, item uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare lid uuid; ex uuid; em text; was boolean;
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  select o.lead_id, o.exhibitor_id, lower(o.to_email), l.opted_out into lid, ex, em, was
  from outbox o join leads l on l.id = o.lead_id where o.id = item and o.channel = 'email';
  if lid is null then return false; end if;
  if was then return true; end if;
  if not exists (select 1 from opt_outs x where x.exhibitor_id = ex and lower(x.email) = em) then
    insert into opt_outs (exhibitor_id, email) values (ex, em);
  end if;
  update leads set opted_out = true where id = lid;
  insert into lead_replies (exhibitor_id, lead_id, body, optout) values (ex, lid, 'הסר · מהקישור במייל', true);
  update outbox set status = 'cancelled', error = 'opted_out' where lead_id = lid and status = 'queued';
  return true;
end $$;

revoke all on function mail_targets(uuid) from public, anon, authenticated;
revoke all on function plan_exhibitors(text), wa_plan(text, uuid), wa_plan_queue(text, uuid, text, text, text, boolean, boolean),
  mail_queue(text, int), mail_result(text, uuid, boolean, text), mail_unsub_info(text, uuid), mail_unsubscribe(text, uuid) from public, authenticated;
grant execute on function plan_exhibitors(text), wa_plan(text, uuid), wa_plan_queue(text, uuid, text, text, text, boolean, boolean),
  mail_queue(text, int), mail_result(text, uuid, boolean, text), mail_unsub_info(text, uuid), mail_unsubscribe(text, uuid) to anon;
