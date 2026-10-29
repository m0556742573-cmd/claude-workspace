-- 0021: where a visitor receives (יצחק, 28–29/10). Each of an exhibitor's leads keeps its own list: the visitor's own
-- phone and mail (from the community list, or typed), and numbers or mails the exhibitor added, as when a visitor with a
-- kosher phone asks that it go to his wife. Each one receives or not; every message goes to every one that receives
-- (which message to which was dropped: "זה יסבך את המשתמש", 29/10). A reply or "הסר" from any of them is the visitor's.
-- Whether a number has WhatsApp is checked once, at the visit (§10): a name on the list keeps it on the list, so one
-- check serves every exhibitor; any other number keeps it on that exhibitor's lead. Not checked again (29/10: "אין צורך").

-- The "another number" of 0020 was never written (nothing used it); it is now a destination like any other.
alter table leads drop column booth_to;

alter table leads
  add column own_phone_on boolean,    -- his own phone receives; null = yes
  add column own_email_on boolean,    -- his own mail receives; null = only when his phone gets no WhatsApp (§10)
  add column typed_whatsapp boolean;  -- the check of his own number when it is not on the list (typed at the booth or by him)

create table lead_contacts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  exhibitor_id uuid not null references exhibitors (id) on delete cascade,
  kind text not null check (kind in ('phone', 'email')),
  value text not null,                        -- a phone as its digits from 0, a mail in lower case
  label text,                                 -- whose it is, if he wrote it: אשתו, המשרד
  receives boolean not null default true,
  has_whatsapp boolean,                       -- a phone: checked once, at the visit
  from_booth boolean not null default false,  -- added on the booth's card, which keeps its own list until it is up
  created_at timestamptz not null default now(),
  unique (lead_id, kind, value),
  check (kind <> 'phone' or value ~ '^0\d{8,9}$'),
  check (kind <> 'email' or value ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);
create index lead_contacts_phone on lead_contacts (value) where kind = 'phone';
alter table lead_contacts enable row level security;
create policy own on lead_contacts for all
  using (exhibitor_id = my_exhibitor())
  with check (exhibitor_id = my_exhibitor() and exists (select 1 from leads l where l.id = lead_id and l.exhibitor_id = my_exhibitor()));

-- A destination added or changed is a change of the card: the planner waits until it settles.
create function touch_lead() returns trigger language plpgsql security definer set search_path = public as $$
begin update leads set updated_at = now() where id = coalesce(new.lead_id, old.lead_id); return null; end $$;
create trigger lead_contacts_touch after insert or update or delete on lead_contacts for each row execute function touch_lead();

-- His own number and mail, and whether the number has WhatsApp: the list's, or the one typed.
create function lead_own(lead uuid) returns table (phone text, email text, wa boolean)
language sql stable security definer set search_path = public as $$
  select phone_key(coalesce(p.phone, l.typed_phone)), lower(btrim(coalesce(p.email, l.typed_email))),
    case when p.phone is not null then p.has_whatsapp else l.typed_whatsapp end
  from leads l left join people p on p.id = l.person_id where l.id = lead
$$;

-- Where a lead's WhatsApp messages go: his own number (to_phone null) when it receives, and every added number that
-- receives; never one known to have no WhatsApp, never one that asked to be removed, never his own twice.
create function wa_targets(lead uuid) returns table (to_phone text)
language sql stable security definer set search_path = public as $$
  select null::text from leads l cross join lateral lead_own(l.id) o
  where l.id = lead and coalesce(l.own_phone_on, true) and o.phone is not null and o.wa is not false
  union all
  select c.value from lead_contacts c join leads l on l.id = c.lead_id
  where c.lead_id = lead and c.kind = 'phone' and c.receives and c.has_whatsapp is not false
    and c.value is distinct from (select o.phone from lead_own(lead) o)
    and not exists (select 1 from opt_outs x where (x.exhibitor_id = l.exhibitor_id or x.exhibitor_id is null)
                    and x.phone is not null and phone_key(x.phone) = c.value)
$$;

-- The planner's view: instead of "has a phone / has WhatsApp", how many destinations get WhatsApp.
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
                'name', coalesce(l.typed_name, p.full_name), 'targets', (select count(*) from wa_targets(l.id)),
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

-- A step of the path is queued once, to every destination that gets WhatsApp at that moment.
drop function wa_plan_queue(text, uuid, text, text, text, text);
create function wa_plan_queue(key text, lead uuid, step text, template text, body text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  if current_phase() <> 'live' then return false; end if;
  if exists (select 1 from outbox o where o.lead_id = lead and o.step_id = step and o.status in ('queued', 'sending', 'sent', 'failed')) then return false; end if;
  insert into outbox (exhibitor_id, lead_id, channel, template_id, body, status, step_id, to_phone)
  select l.exhibitor_id, l.id, 'whatsapp', template, body, 'queued', step, t.to_phone
  from leads l cross join lateral wa_targets(l.id) t where l.id = lead and not l.practice;
  return found;
end $$;

-- A message he sends from the app ("לשלוח מהוואטסאפ שלי"): to every destination that gets WhatsApp. How many.
create function queue_send(lead uuid, template text, body text) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not exists (select 1 from leads l where l.id = lead and l.exhibitor_id = my_exhibitor()) then raise exception 'not allowed'; end if;
  insert into outbox (exhibitor_id, lead_id, channel, template_id, body, status, to_phone)
  select my_exhibitor(), lead, 'whatsapp', template, body, 'queued', t.to_phone from wa_targets(lead) t;
  get diagnostics n = row_count;
  return n;
end $$;

-- The queue: each row's own number, and whether it is already known to have WhatsApp (then it is not asked again).
drop function wa_queue(text, int);
create function wa_queue(key text, max_rows int default 50)
returns table (id uuid, exhibitor_id uuid, lead_id uuid, body text, phone text, name text, first_contact boolean, save_contact boolean, first_today int, known boolean)
language plpgsql security definer set search_path = public as $$
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  if current_phase() <> 'live' then return; end if;
  update outbox o set status = 'cancelled', error = 'opted_out'
  from leads l left join people p on p.id = l.person_id
  where o.lead_id = l.id and o.status = 'queued' and o.channel = 'whatsapp'
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
    coalesce(case when o.to_phone is null then own.wa else c.has_whatsapp end, false)
  from outbox o
  join leads l on l.id = o.lead_id
  left join people p on p.id = l.person_id
  cross join lateral lead_own(l.id) own
  left join lead_contacts c on c.lead_id = o.lead_id and c.kind = 'phone' and c.value = o.to_phone
  join exhibitors e on e.id = o.exhibitor_id
  where o.status = 'queued' and o.channel = 'whatsapp' and (o.not_before is null or o.not_before <= now()) and e.wa_blocked_at is null
    and not l.practice
  order by o.created_at
  limit max_rows;
end $$;

-- What a send taught about a number is kept where it belongs: on the list for a listed name (one check serves every
-- exhibitor), on the lead for a number he typed, on the destination for one that was added.
create or replace function wa_result(key text, item uuid, ok boolean, err text default null, first boolean default null)
returns void language plpgsql security definer set search_path = public as $$
declare lid uuid; sid text; dest text; pid uuid; listed boolean;
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  update outbox set status = case when ok then 'sent' else 'failed' end, sent_at = case when ok then now() end,
    error = err, first_contact = first
  where id = item and status = 'queued'
  returning lead_id, step_id, to_phone into lid, sid, dest;
  if lid is null then return; end if;
  if ok and sid is not null then
    insert into lead_steps (lead_id, step_id, done_on, outcome)
    values (lid, sid, (now() at time zone 'Asia/Jerusalem')::date, 'noAnswer') on conflict (lead_id, step_id) do nothing;
  end if;
  if not (ok or err = 'no_whatsapp') then return; end if;
  if dest is not null then
    update lead_contacts set has_whatsapp = ok where lead_id = lid and kind = 'phone' and value = dest;
  else
    select l.person_id, p.phone is not null into pid, listed from leads l left join people p on p.id = l.person_id where l.id = lid;
    if listed then update people set has_whatsapp = ok where id = pid;
    else update leads set typed_whatsapp = ok where id = lid; end if;
  end if;
end $$;

-- The check at the visit (§10): every number of one lead and what is known about it. Nothing in practice.
create function wa_to_check(key text, exhibitor uuid, lead uuid) returns table (num text, own boolean, wa boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  if current_phase() <> 'live' then return; end if;
  return query
  select o.phone, true, o.wa from leads l cross join lateral lead_own(l.id) o
  where l.id = lead and l.exhibitor_id = exhibitor and not l.practice and o.phone is not null
  union all
  select c.value, false, c.has_whatsapp from lead_contacts c join leads l on l.id = c.lead_id
  where c.lead_id = lead and l.exhibitor_id = exhibitor and not l.practice and c.kind = 'phone';
end $$;

-- What the check found. A listed name keeps it on the list, once (the first check answers for every exhibitor).
create function wa_checked(key text, exhibitor uuid, lead uuid, num text, ok boolean) returns void
language plpgsql security definer set search_path = public as $$
declare pid uuid; listed text; typed text;
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  select l.person_id, p.phone, l.typed_phone into pid, listed, typed
  from leads l left join people p on p.id = l.person_id where l.id = lead and l.exhibitor_id = exhibitor;
  if not found then return; end if;
  update lead_contacts set has_whatsapp = ok where lead_id = lead and kind = 'phone' and value = phone_key(num) and has_whatsapp is null;
  if phone_key(listed) = phone_key(num) then
    update people set has_whatsapp = ok where id = pid and has_whatsapp is null;
  elsif listed is null and phone_key(typed) = phone_key(num) then
    update leads set typed_whatsapp = ok where id = lead and typed_whatsapp is null;
  end if;
end $$;

-- Replies are read from every number of his leads, the added ones too.
create or replace function wa_lead_phones(key text)
returns table (exhibitor_id uuid, phones text[])
language plpgsql stable security definer set search_path = public as $$
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  return query
  select e.id, array_agg(distinct x.num) filter (where x.num is not null)
  from exhibitors e join (
    select l.exhibitor_id ex, phone_key(coalesce(p.phone, l.typed_phone)) num from leads l left join people p on p.id = l.person_id
    union all
    select c.exhibitor_id, c.value from lead_contacts c where c.kind = 'phone'
  ) x on x.ex = e.id
  where e.wa_read_replies and e.wa_blocked_at is null
  group by e.id;
end $$;

-- A reply from any of a lead's numbers is his: the path stops; "הסר" removes him, and that number goes on the list.
-- ("phone" is both the argument and a column of people: the argument is meant; it was ambiguous since 0016.)
create or replace function wa_inbound(key text, exhibitor uuid, phone text, body text)
returns uuid language plpgsql security definer set search_path = public as $$
#variable_conflict use_variable
declare lid uuid; raw text; is_out boolean;
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  if not coalesce((select wa_read_replies from exhibitors where id = exhibitor), false) then return null; end if;
  select l.id, case when phone_key(coalesce(p.phone, l.typed_phone)) = phone_key(phone) then coalesce(p.phone, l.typed_phone) else phone_key(phone) end
  into lid, raw
  from leads l left join people p on p.id = l.person_id
  where l.exhibitor_id = exhibitor
    and (phone_key(coalesce(p.phone, l.typed_phone)) = phone_key(phone)
      or exists (select 1 from lead_contacts c where c.lead_id = l.id and c.kind = 'phone' and c.value = phone_key(phone)))
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

-- Where a lead receives, for his own screens: his own phone and mail, and what was added; each with whether it
-- receives, whether it has WhatsApp, and whether it asked to be removed.
create function lead_destinations(lead uuid)
returns table (id uuid, kind text, value text, label text, own boolean, receives boolean, wa boolean, removed boolean)
language sql stable security definer set search_path = public as $$
  with me as (
    select l.id, l.exhibitor_id, l.opted_out, l.own_phone_on, l.own_email_on, o.phone, o.email, o.wa
    from leads l cross join lateral lead_own(l.id) o where l.id = lead and l.exhibitor_id = my_exhibitor()
  ),
  gone as (select x.phone, lower(x.email) email from opt_outs x join me on x.exhibitor_id = me.exhibitor_id or x.exhibitor_id is null)
  select null::uuid, 'phone', me.phone, null::text, true, coalesce(me.own_phone_on, true), me.wa,
    me.opted_out or exists (select 1 from gone where phone_key(gone.phone) = me.phone)
  from me where me.phone is not null
  union all
  select null::uuid, 'email', me.email, null::text, true,
    coalesce(me.own_email_on, not (coalesce(me.own_phone_on, true) and me.phone is not null and coalesce(me.wa, false))), null::boolean,
    me.opted_out or exists (select 1 from gone where gone.email = me.email)
  from me where me.email is not null
  union all
  select c.id, c.kind, c.value, c.label, false, c.receives, c.has_whatsapp,
    me.opted_out or exists (select 1 from gone where (c.kind = 'phone' and phone_key(gone.phone) = c.value) or (c.kind = 'email' and gone.email = c.value))
  from me join lead_contacts c on c.lead_id = me.id
$$;

revoke all on function touch_lead(), lead_own(uuid), wa_targets(uuid) from public, anon, authenticated;
revoke all on function wa_plan(text, uuid), wa_plan_queue(text, uuid, text, text, text), wa_queue(text, int),
  wa_result(text, uuid, boolean, text, boolean), wa_to_check(text, uuid, uuid), wa_checked(text, uuid, uuid, text, boolean),
  wa_lead_phones(text), wa_inbound(text, uuid, text, text) from public, authenticated;
grant execute on function wa_plan(text, uuid), wa_plan_queue(text, uuid, text, text, text), wa_queue(text, int),
  wa_result(text, uuid, boolean, text, boolean), wa_to_check(text, uuid, uuid), wa_checked(text, uuid, uuid, text, boolean),
  wa_lead_phones(text), wa_inbound(text, uuid, text, text) to anon;
revoke all on function queue_send(uuid, text, text), lead_destinations(uuid) from public, anon;
grant execute on function queue_send(uuid, text, text), lead_destinations(uuid) to authenticated;
