-- 0016: WhatsApp, step 2a (יצחק, 28/10). Sending from the exhibitor's own number through the WhatsApp server
-- (wa-server/), his leads' replies, and the server's own key. Nothing here sends: the server does, at a person's pace,
-- within its limits. A message is queued by the exhibitor (outbox, status 'queued'); the server takes it from here.

alter table exhibitors
  add column wa_read_replies boolean not null default false,   -- model §9: replies are read only with his explicit consent
  add column wa_save_contacts boolean not null default false,  -- יצחק 28/10: "אולי להוסיף אפשרות"
  add column wa_blocked_at timestamptz,                        -- the server saw signs of a block; nothing more goes out
  add column wa_blocked_reason text;

-- A first message to someone who never had a conversation with this number: counted against the daily limit.
alter table outbox add column first_contact boolean;

-- What a lead wrote back. Only leads' numbers ever reach here; every other chat stays on the phone (model §9).
create table lead_replies (
  id uuid primary key default gen_random_uuid(),
  exhibitor_id uuid not null references exhibitors(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  body text not null,
  at timestamptz not null default now(),
  optout boolean not null default false
);
alter table lead_replies enable row level security;
create policy own_read on lead_replies for select using (exhibitor_id = my_exhibitor());
create index lead_replies_lead on lead_replies (lead_id);

-- The WhatsApp server's key. Only its hash is kept here; the key itself lives on the server and nowhere else.
-- No policy: only the functions below read it.
create table wa_keys (hash text primary key, created_at timestamptz not null default now());
alter table wa_keys enable row level security;

create function wa_ok(key text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from wa_keys where hash = encode(sha256(convert_to(coalesce(key, ''), 'UTF8')), 'hex'))
$$;

-- What waits to go out on WhatsApp, oldest first, with what the server needs to send it at a person's pace.
-- A lead who asked to be removed since it was queued is never sent to.
create function wa_queue(key text, max_rows int default 50)
returns table (id uuid, exhibitor_id uuid, lead_id uuid, body text, phone text, name text, first_contact boolean, save_contact boolean, first_today int)
language plpgsql security definer set search_path = public as $$
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  update outbox o set status = 'cancelled', error = 'opted_out'
  from leads l left join people p on p.id = l.person_id
  where o.lead_id = l.id and o.status = 'queued' and o.channel = 'whatsapp'
    and (l.opted_out or exists (
      select 1 from opt_outs x where (x.exhibitor_id = l.exhibitor_id or x.exhibitor_id is null)
        and x.phone is not null and phone_key(x.phone) = phone_key(coalesce(p.phone, l.typed_phone))));
  return query
  select o.id, o.exhibitor_id, o.lead_id, o.body, phone_key(coalesce(p.phone, l.typed_phone)), coalesce(l.typed_name, p.full_name),
    not exists (select 1 from outbox s where s.lead_id = o.lead_id and s.channel = 'whatsapp' and s.status = 'sent')
      and not exists (select 1 from lead_replies r where r.lead_id = o.lead_id),
    e.wa_save_contacts,
    (select count(*)::int from outbox s where s.exhibitor_id = o.exhibitor_id and s.channel = 'whatsapp' and s.status = 'sent'
       and s.first_contact and s.sent_at >= (date_trunc('day', now() at time zone 'Asia/Jerusalem') at time zone 'Asia/Jerusalem'))
  from outbox o
  join leads l on l.id = o.lead_id
  left join people p on p.id = l.person_id
  join exhibitors e on e.id = o.exhibitor_id
  where o.status = 'queued' and o.channel = 'whatsapp' and (o.not_before is null or o.not_before <= now()) and e.wa_blocked_at is null
  order by o.created_at
  limit max_rows;
end $$;

-- How a send ended. 'no_whatsapp' also tells the community list that this number has no WhatsApp (model §10).
create function wa_result(key text, item uuid, ok boolean, err text default null, first boolean default null)
returns void language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  update outbox set status = case when ok then 'sent' else 'failed' end, sent_at = case when ok then now() end,
    error = err, first_contact = first
  where id = item and status = 'queued';
  select l.person_id into pid from outbox o join leads l on l.id = o.lead_id where o.id = item;
  if pid is not null and (ok or err = 'no_whatsapp') then update people set has_whatsapp = ok where id = pid; end if;
end $$;

-- For each exhibitor who agreed to have replies read: the numbers of his leads. The server drops every other chat at once.
create function wa_lead_phones(key text)
returns table (exhibitor_id uuid, phones text[])
language plpgsql stable security definer set search_path = public as $$
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  return query
  select e.id, array_agg(distinct phone_key(coalesce(p.phone, l.typed_phone))) filter (where phone_key(coalesce(p.phone, l.typed_phone)) is not null)
  from exhibitors e join leads l on l.exhibitor_id = e.id left join people p on p.id = l.person_id
  where e.wa_read_replies and e.wa_blocked_at is null
  group by e.id;
end $$;

-- A reply from a lead. "הסר" is caught by the word, not by AI (model §9): he goes on the opt-out list.
create function wa_inbound(key text, exhibitor uuid, phone text, body text)
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
  if is_out then
    insert into opt_outs (exhibitor_id, phone) values (exhibitor, raw);
    update leads set opted_out = true where id = lid;
  end if;
  return lid;
end $$;

-- The server saw signs of a block on this number: nothing more goes out until he looks at it.
create function wa_blocked(key text, exhibitor uuid, reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  update exhibitors set wa_blocked_at = now(), wa_blocked_reason = left(reason, 200) where id = exhibitor;
end $$;

-- Supabase grants new functions to anon and authenticated by name; only the server (with its key) calls these.
revoke all on function wa_ok(text) from public, anon, authenticated;
revoke all on function wa_queue(text, int), wa_result(text, uuid, boolean, text, boolean), wa_lead_phones(text),
  wa_inbound(text, uuid, text, text), wa_blocked(text, uuid, text) from public, authenticated;
grant execute on function wa_queue(text, int), wa_result(text, uuid, boolean, text, boolean), wa_lead_phones(text),
  wa_inbound(text, uuid, text, text), wa_blocked(text, uuid, text) to anon;
