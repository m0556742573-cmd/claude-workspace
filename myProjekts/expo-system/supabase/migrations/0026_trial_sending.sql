-- 0026: trying the booth before the fair (יצחק, 29/10). Before the fair every booth is a trial booth with sample names
-- (17/10), and each exhibitor chooses: try without sending, as before, or with every message sent to himself (his own
-- WhatsApp and mail, and any number or mail he adds), each opening with the visitor it would have gone to. A fast clock
-- can run a day in a minute, so a whole path is seen in one sitting. No visitor gets anything before the fair.
-- With it, two holes closed: an exhibitor could approve himself, and could queue mail and WhatsApp to anyone by writing
-- to the outbox directly. And the "after" phase now really keeps sending, as the admin platform says it does.

-- ---------- the exhibitor's choice
alter table exhibitors add column trial_send boolean not null default false,
  add column trial_fast boolean not null default false,
  add column trial_to text[] not null default '{}';

-- What a step was done on by the trial's fast clock (the real done_on stays for the app), and which queued messages
-- are trial ones (they go out only while the system is before the fair).
alter table lead_steps add column virtual_on date;
alter table outbox add column trial boolean not null default false, add column virtual_on date;

-- The trial leads that send: before the fair only, the first 10 of a booth that chose to try with sending.
create function trial_lead(lead uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select current_phase() = 'practice' and exists (
    select 1 from leads l join exhibitors e on e.id = l.exhibitor_id
    where l.id = lead and l.practice and e.trial_send
      and l.id in (select x.id from leads x where x.exhibitor_id = l.exhibitor_id and x.practice order by x.captured_at, x.id limit 10))
$$;

-- Where a trial message goes: the exhibitor himself (his WhatsApp number, his mail), and what he added.
create function trial_dests(ex uuid) returns table (kind text, value text)
language sql stable security definer set search_path = public as $$
  select 'phone'::text, phone_key(e.whatsapp) from exhibitors e where e.id = ex and phone_key(e.whatsapp) is not null
  union
  select 'email', lower(btrim(e.email)) from exhibitors e where e.id = ex and nullif(btrim(e.email), '') is not null
  union
  select case when v like '%@%' then 'email' else 'phone' end, case when v like '%@%' then lower(btrim(v)) else phone_key(v) end
  from exhibitors e cross join unnest(e.trial_to) v where e.id = ex and nullif(btrim(v), '') is not null
$$;

-- The line that opens a trial message: who it would have gone to, and where.
create function trial_prefix(lead uuid) returns text
language sql stable security definer set search_path = public as $$
  select 'ניסיון · הייתה יוצאת אל ' || coalesce(nullif(btrim(coalesce(l.typed_name, p.full_name)), ''), 'המבקר')
    || coalesce(', ' || o.phone, '') || coalesce(', ' || o.email, '') || E'\n\n'
  from leads l left join people p on p.id = l.person_id cross join lateral lead_own(l.id) o where l.id = lead
$$;

-- ---------- where a lead's messages go: a trial lead's go to the trial destinations; a practice lead without trial
-- sending has none; a real lead's are as before (0021, 0022)
create or replace function wa_targets(lead uuid) returns table (to_phone text)
language sql stable security definer set search_path = public as $$
  select d.value from leads l cross join lateral trial_dests(l.exhibitor_id) d
  where l.id = lead and l.practice and d.kind = 'phone' and trial_lead(lead)
  union all
  select null::text from leads l cross join lateral lead_own(l.id) o
  where l.id = lead and not l.practice and coalesce(l.own_phone_on, true) and o.phone is not null and o.wa is not false
  union all
  select c.value from lead_contacts c join leads l on l.id = c.lead_id
  where c.lead_id = lead and not l.practice and c.kind = 'phone' and c.receives and c.has_whatsapp is not false
    and c.value is distinct from (select o.phone from lead_own(lead) o)
    and not exists (select 1 from opt_outs x where (x.exhibitor_id = l.exhibitor_id or x.exhibitor_id is null)
                    and x.phone is not null and phone_key(x.phone) = c.value)
$$;

create or replace function mail_targets(lead uuid) returns table (to_email text)
language sql stable security definer set search_path = public as $$
  with me as (
    select l.id, l.exhibitor_id, l.practice, l.own_phone_on, l.own_email_on, o.phone, o.email, o.wa, e.mail_always
    from leads l cross join lateral lead_own(l.id) o join exhibitors e on e.id = l.exhibitor_id where l.id = lead
  )
  select d.value from me cross join lateral trial_dests(me.exhibitor_id) d
  where me.practice and d.kind = 'email' and trial_lead(lead)
  union
  select me.email from me
  where not me.practice and me.email is not null
    and coalesce(me.own_email_on, me.mail_always or not (coalesce(me.own_phone_on, true) and me.phone is not null and coalesce(me.wa, false)))
    and not exists (select 1 from opt_outs x where (x.exhibitor_id = me.exhibitor_id or x.exhibitor_id is null) and lower(x.email) = me.email)
  union
  select c.value from lead_contacts c join me on me.id = c.lead_id
  where not me.practice and c.kind = 'email' and c.receives
    and not exists (select 1 from opt_outs x where (x.exhibitor_id = me.exhibitor_id or x.exhibitor_id is null) and lower(x.email) = c.value)
$$;

-- ---------- the planner: real booths when live or after the fair; before it, the booths that try with sending
drop function plan_exhibitors(text);
create function plan_exhibitors(key text) returns table (id uuid, trial boolean, fast boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  if current_phase() in ('live', 'after') then
    return query select e.id, false, false from exhibitors e where e.approved;
  elsif current_phase() = 'practice' then
    return query select e.id, true, e.trial_fast from exhibitors e where e.approved and e.trial_send;
  end if;
end $$;

-- A booth's plan: its real leads, or before the fair its trial leads; with when each was registered (the fast clock
-- counts from it) and the fast clock's day of each step.
create or replace function wa_plan(key text, exhibitor uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  return jsonb_build_object(
    'me', (select jsonb_build_object('name', e.name, 'business', e.business, 'phone', e.phone, 'greeting', coalesce(e.greeting, 'shalom'),
             'sensitive', e.sensitive, 'blocked', e.wa_blocked_at is not null, 'fills', e.fills) from exhibitors e where e.id = exhibitor),
    'setups', (select coalesce(jsonb_agg(jsonb_build_object('version', s.version, 'active', s.active, 'data', s.data)), '[]'::jsonb)
               from setups s where s.exhibitor_id = exhibitor),
    'texts', (select coalesce(jsonb_object_agg(t.id, t.body), '{}'::jsonb) from message_templates t where t.exhibitor_id = exhibitor),
    'leads', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', l.id, 'captured_on', l.captured_on, 'captured_at', l.captured_at, 'taps', l.taps, 'customer_date', l.customer_date,
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
    'steps', (select coalesce(jsonb_agg(jsonb_build_object('lead_id', s.lead_id, 'step_id', s.step_id, 'done_on', s.done_on, 'virtual_on', s.virtual_on, 'outcome', s.outcome) order by s.created_at), '[]'::jsonb)
              from lead_steps s join leads l on l.id = s.lead_id where l.exhibitor_id = exhibitor),
    'manual', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'lead_id', m.lead_id, 'action', m.action, 'who', m.who, 'due_on', m.due_on, 'message', m.message)), '[]'::jsonb)
               from manual_steps m where m.exhibitor_id = exhibitor),
    'replies', (select coalesce(jsonb_agg(jsonb_build_object('lead_id', r.lead_id, 'at', r.at, 'optout', r.optout) order by r.at), '[]'::jsonb)
                from lead_replies r where r.exhibitor_id = exhibitor),
    'planned', (select coalesce(jsonb_agg(o.lead_id::text || '|' || o.step_id), '[]'::jsonb)
                from outbox o where o.exhibitor_id = exhibitor and o.step_id is not null and o.status in ('queued', 'sending', 'sent', 'failed'))
  );
end $$;

-- ---------- queueing: a trial message opens with who it would have gone to, and is marked as trial
drop function wa_plan_queue(text, uuid, text, text, text, boolean, boolean, text[]);
create function wa_plan_queue(key text, lead uuid, step text, template text, body text, wa boolean default true, mail boolean default false,
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
  from leads l cross join lateral mail_targets(l.id) m where mail and l.id = lead;
  return found;
end $$;

-- A message sent from the app by the server: a trial lead's goes to the exhibitor, a practice lead's without trial nowhere.
create or replace function queue_send(lead uuid, template text, body text, files text[] default null) returns int
language plpgsql security definer set search_path = public as $$
declare n int; tr boolean; pre text := '';
begin
  select l.practice into tr from leads l where l.id = lead and l.exhibitor_id = my_exhibitor();
  if tr is null then raise exception 'not allowed'; end if;
  if tr then
    if not trial_lead(lead) then return 0; end if;
    pre := trial_prefix(lead);
  end if;
  insert into outbox (exhibitor_id, lead_id, channel, template_id, body, status, to_phone, files, trial)
  select my_exhibitor(), lead, 'whatsapp', template, pre || body, 'queued', t.to_phone, files, tr from wa_targets(lead) t;
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------- the queues: real messages while live or after the fair, trial messages only before it
drop function wa_queue(text, int);
create function wa_queue(key text, max_rows int default 50)
returns table (id uuid, exhibitor_id uuid, lead_id uuid, body text, phone text, name text, first_contact boolean, save_contact boolean, first_today int, known boolean, files text[], trial boolean)
language plpgsql security definer set search_path = public as $$
declare ph text := current_phase();
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  update outbox o set status = 'cancelled', error = 'opted_out'
  from leads l left join people p on p.id = l.person_id
  where o.lead_id = l.id and o.status = 'queued' and o.channel = 'whatsapp' and not o.trial
    and (l.opted_out or exists (
      select 1 from opt_outs x where (x.exhibitor_id = l.exhibitor_id or x.exhibitor_id is null) and x.phone is not null
        and phone_key(x.phone) = coalesce(o.to_phone, phone_key(coalesce(p.phone, l.typed_phone)))));
  return query
  select o.id, o.exhibitor_id, o.lead_id, o.body, coalesce(o.to_phone, own.phone),
    coalesce(l.typed_name, p.full_name),
    not exists (select 1 from lead_replies r where r.lead_id = o.lead_id),
    e.wa_save_contacts and o.to_phone is null,
    (select count(*)::int from outbox s where s.exhibitor_id = o.exhibitor_id and s.channel = 'whatsapp' and s.status = 'sent'
       and s.first_contact and s.sent_at >= (date_trunc('day', now() at time zone 'Asia/Jerusalem') at time zone 'Asia/Jerusalem')),
    coalesce(case when o.to_phone is null then own.wa else c.has_whatsapp end, false),
    o.files,
    o.trial
  from outbox o
  join leads l on l.id = o.lead_id
  left join people p on p.id = l.person_id
  cross join lateral lead_own(l.id) own
  left join lead_contacts c on c.lead_id = o.lead_id and c.kind = 'phone' and c.value = o.to_phone
  join exhibitors e on e.id = o.exhibitor_id
  where o.status = 'queued' and o.channel = 'whatsapp' and (o.not_before is null or o.not_before <= now()) and e.wa_blocked_at is null
    and case when o.trial then ph = 'practice' and l.practice else ph in ('live', 'after') and not l.practice end
  order by o.created_at
  limit max_rows;
end $$;

drop function mail_queue(text, int);
create function mail_queue(key text, max_rows int default 50)
returns table (id uuid, to_email text, body text, from_name text, reply_to text, subject text, files text[], trial boolean)
language plpgsql security definer set search_path = public as $$
declare ph text := current_phase();
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  update outbox o set status = 'cancelled', error = 'opted_out'
  from leads l
  where o.lead_id = l.id and o.status = 'queued' and o.channel = 'email' and not o.trial
    and (l.opted_out or exists (select 1 from opt_outs x where (x.exhibitor_id = l.exhibitor_id or x.exhibitor_id is null) and lower(x.email) = lower(o.to_email)));
  return query
  select o.id, o.to_email, o.body, e.name, nullif(btrim(e.email), ''),
    case when e.sensitive or coalesce((select (s.data->>'sensitive')::boolean from setups s where s.exhibitor_id = e.id and s.active limit 1), false)
      then e.name else coalesce(nullif(btrim(e.business), ''), e.name) end,
    o.files,
    o.trial
  from outbox o join leads l on l.id = o.lead_id join exhibitors e on e.id = o.exhibitor_id
  where o.status = 'queued' and o.channel = 'email' and o.to_email is not null and (o.not_before is null or o.not_before <= now())
    and case when o.trial then ph = 'practice' and l.practice else ph in ('live', 'after') and not l.practice end
  order by o.created_at
  limit max_rows;
end $$;

-- ---------- results: a trial step keeps the fast clock's day beside the real one
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
  end if;
end $$;

create or replace function mail_result(key text, item uuid, ok boolean, err text default null)
returns void language plpgsql security definer set search_path = public as $$
declare lid uuid; sid text; vday date;
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  update outbox set status = case when ok then 'sent' else 'failed' end, sent_at = case when ok then now() end, error = err
  where id = item and status = 'queued' and channel = 'email'
  returning lead_id, step_id, virtual_on into lid, sid, vday;
  if ok and sid is not null then
    insert into lead_steps (lead_id, step_id, done_on, outcome, virtual_on)
    values (lid, sid, (now() at time zone 'Asia/Jerusalem')::date, 'noAnswer', vday) on conflict (lead_id, step_id) do nothing;
  end if;
end $$;

-- ---------- the community list only from the fair on (17/10, 29/10): before it the booths search sample names, and the
-- server no longer hands the real list to anyone but the admin
create or replace function people_directory()
returns table (id uuid, full_name text, city text, business_owner boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.city, p.business_owner from people p
  where my_exhibitor() is not null and (current_phase() <> 'practice' or is_admin())
$$;

create or replace function search_people(q text, max int default 12)
returns table (id uuid, full_name text, city text, business_owner boolean)
language sql stable security definer set search_path = public, extensions as $$
  select p.id, p.full_name, p.city, p.business_owner
  from people p
  where my_exhibitor() is not null and (current_phase() <> 'practice' or is_admin()) and length(trim(q)) >= 2
    and (p.full_name % q or p.full_name ilike '%' || trim(q) || '%')
  order by similarity(p.full_name, q) desc
  limit least(max, 30)
$$;

-- ---------- holes closed
-- An exhibitor edits his own details, never his approval, his owner or his id: an approved booth can search the
-- community names, so only the admin approves (0003).
revoke update on exhibitors from authenticated;
grant update (name, business, phone, email, greeting, sensitive, whatsapp, whatsapp_kind, onboarded, join_code,
  wa_read_replies, wa_save_contacts, wa_blocked_at, wa_blocked_reason, booth_default, mail_always, fills,
  trial_send, trial_fast, trial_to) on exhibitors to authenticated;

-- The app only records what it sent by a tap (status sent) or what he chose not to send (cancelled). Queued messages
-- come only through the functions above, which choose the destinations; written directly, a queued row could carry
-- any address, and the server would send it.
drop policy own on outbox;
create policy own_read on outbox for select using (exhibitor_id = my_exhibitor());
create policy own_record on outbox for insert with check (
  exhibitor_id = my_exhibitor() and status in ('sent', 'cancelled') and to_phone is null and to_email is null and not trial
  and exists (select 1 from leads l where l.id = lead_id and l.exhibitor_id = my_exhibitor()));

revoke all on function trial_lead(uuid), trial_dests(uuid), trial_prefix(uuid) from public, anon, authenticated;
revoke all on function plan_exhibitors(text), wa_plan_queue(text, uuid, text, text, text, boolean, boolean, text[], date),
  wa_queue(text, int), mail_queue(text, int) from public, authenticated;
grant execute on function plan_exhibitors(text), wa_plan_queue(text, uuid, text, text, text, boolean, boolean, text[], date),
  wa_queue(text, int), mail_queue(text, int) to anon;
