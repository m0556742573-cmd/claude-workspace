-- Fixes from the full review (30/10), the database's part, with יצחק's yes on the two open questions:
-- "הסר" in WhatsApp is honoured always (only the word is looked at when replies are not read), and the sender's own
-- name before the @ for each exhibitor (unique among them).

-- ---------- approval only by the mail he signed in with (the mail in his details is his to change)
create or replace function admin_load_exhibitor_list(rows jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare added int; approved_now int;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  insert into exhibitor_list (email, name, business)
  select lower(trim(r ->> 'email')), nullif(trim(r ->> 'name'), ''), nullif(trim(r ->> 'business'), '')
  from jsonb_array_elements(rows) r
  where coalesce(trim(r ->> 'email'), '') like '%@%'
  on conflict (email) do update set name = coalesce(excluded.name, exhibitor_list.name), business = coalesce(excluded.business, exhibitor_list.business);
  get diagnostics added = row_count;
  update exhibitors e set approved = true, business = case when e.business = '' then coalesce(l.business, '') else e.business end
  from exhibitor_list l, auth.users u
  where u.id = e.owner and u.email_confirmed_at is not null and lower(u.email) = l.email and not e.approved;
  get diagnostics approved_now = row_count;
  return jsonb_build_object('rows', added, 'approved', approved_now);
end $$;

-- The admin sees the mail each booth signed in with, not the one it typed.
create or replace function admin_exhibitors()
returns table (id uuid, name text, email text, business text, approved boolean, created_at timestamptz, leads bigint)
language sql stable security definer set search_path = public as $$
  select e.id, e.name, coalesce((select u.email from auth.users u where u.id = e.owner), e.email), e.business, e.approved, e.created_at,
    (select count(*) from leads l where l.exhibitor_id = e.id)
  from exhibitors e where is_admin() order by e.approved, e.created_at desc
$$;

-- On the organisers' list means approved, once the mail is confirmed (Google confirms at once; a mail code on the first
-- sign-in), never on a sign-up that has not proved the mail.
create or replace function on_signup() returns trigger language plpgsql security definer set search_path = public as $$
declare listed exhibitor_list%rowtype;
begin
  select * into listed from exhibitor_list where lower(email) = lower(new.email);
  insert into exhibitors (owner, name, business, email, approved)
  values (
    new.id,
    coalesce(listed.name, new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(listed.business, ''),
    new.email,
    listed.email is not null and new.email_confirmed_at is not null
  )
  on conflict (owner) do nothing;
  return new;
end $$;
create function on_confirm() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update exhibitors e set approved = true
  where e.owner = new.id and not e.approved and exists (select 1 from exhibitor_list l where l.email = lower(new.email));
  return new;
end $$;
create trigger exhibitor_on_confirm after update of email_confirmed_at on auth.users
  for each row when (old.email_confirmed_at is null and new.email_confirmed_at is not null) execute function on_confirm();
revoke execute on function on_confirm() from public, anon, authenticated;

-- ---------- what an exhibitor may change on himself: not his join code (the printed sign), the logo only from his folder
revoke update (join_code) on exhibitors from authenticated;
alter table exhibitors drop constraint exhibitors_logo_check;
alter table exhibitors add constraint exhibitors_logo_check
  check (logo is null or (logo ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.png$' and split_part(logo, '/', 1) = id::text));
-- At most three trial destinations: the trial is for him and those near him, not a mailing list.
alter table exhibitors add constraint exhibitors_trial_to_check check (cardinality(trial_to) <= 3);

-- ---------- his own name before the @ in the mails to his visitors (יצחק, 30/10): unique among the exhibitors
alter table exhibitors add column mail_name text
  check (mail_name ~ '^[a-z0-9]([a-z0-9-]{0,28}[a-z0-9])?$'
    and mail_name not in ('expo', 'login', 'hello', 'info', 'admin', 'support', 'yhm', 'postmaster', 'abuse', 'noreply', 'no-reply', 'mailer-daemon'));
create unique index exhibitors_mail_name on exhibitors (mail_name) where mail_name is not null;
grant update (mail_name) on exhibitors to authenticated;
create function mail_name_free(name text) returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from exhibitors where mail_name = lower(btrim(name)) and id <> coalesce(my_exhibitor(), '00000000-0000-0000-0000-000000000000'))
$$;
revoke all on function mail_name_free(text) from public, anon;
grant execute on function mail_name_free(text) to authenticated;

-- ---------- the visitor's removal is his: an exhibitor can neither undo it nor clear the lead's mark
alter table opt_outs add column by_visitor boolean not null default false;
drop policy own on opt_outs;
create policy own_read on opt_outs for select using (exhibitor_id = my_exhibitor());
create or replace function opt_out_lead(lead uuid, asked boolean) returns void language plpgsql security definer set search_path = public as $$
declare c record;
begin
  select coalesce(p.phone, l.typed_phone) as phone, coalesce(l.typed_email, p.email) as email into c
  from leads l left join people p on p.id = l.person_id
  where l.id = lead and l.exhibitor_id = my_exhibitor();
  if not found then raise exception 'not allowed'; end if;
  if asked then
    if c.phone is not null or c.email is not null then
      insert into opt_outs (exhibitor_id, phone, email) values (my_exhibitor(), c.phone, c.email);
    end if;
    update leads set opted_out = true where id = lead;
  else
    -- Undoing his own mark takes back only what he marked; what the visitor asked stays.
    delete from opt_outs o where o.exhibitor_id = my_exhibitor() and not o.by_visitor
      and (o.phone is not distinct from c.phone) and (o.email is not distinct from c.email);
    if not exists (select 1 from opt_outs o where o.exhibitor_id = my_exhibitor() and o.by_visitor
      and ((c.phone is not null and phone_key(o.phone) = phone_key(c.phone)) or (c.email is not null and lower(o.email) = lower(c.email)))) then
      update leads set opted_out = false where id = lead;
    end if;
  end if;
end $$;

-- The practice mark and a visitor's removal are the server's to set: an exhibitor's own update leaves them as they were.
create function leads_guard() returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.practice := old.practice;
    if old.opted_out and not new.opted_out then new.opted_out := true; end if;
  end if;
  return new;
end $$;
create trigger leads_guard before update on leads for each row execute function leads_guard();
revoke execute on function leads_guard() from public, anon, authenticated;

-- ---------- a card registered offline in practice stays practice, even when it uploads after the switch to live
alter table system_state add column live_since timestamptz;
create or replace function mark_practice() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.practice := current_phase() = 'practice'
    or (new.captured_at is not null and new.captured_at < (select live_since from system_state where id = 1));
  return new;
end $$;
create or replace function admin_set_phase(to_phase text, drop_practice boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare dropped int := 0;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  if to_phase not in ('practice', 'live', 'after') then raise exception 'unknown phase'; end if;
  if to_phase = 'live' and drop_practice then
    delete from leads where practice;
    get diagnostics dropped = row_count;
  end if;
  update system_state set
    live_since = case when to_phase = 'live' and phase = 'practice' then now() when to_phase = 'practice' then null else live_since end,
    phase = to_phase, changed_at = now(), changed_by = auth.jwt() ->> 'email'
  where id = 1;
  return jsonb_build_object('phase', to_phase, 'dropped', dropped);
end $$;
-- Who switched the phase stays with the admin; everyone else reads the phase alone.
revoke select on system_state from anon, authenticated;
grant select (id, phase, changed_at) on system_state to anon, authenticated;

-- ---------- a step marked again (an upsert of a step already recorded) cancels what the path still had queued too
drop trigger lead_steps_cancel on lead_steps;
create trigger lead_steps_cancel after insert or update of outcome on lead_steps for each row execute function cancel_planned();

-- ---------- self-registration: closed after the fair; linked to the community list only from the fair on, and only to
-- the one person whose name matches in whole words (a family's shared phone is not one person)
create or replace function join_booth(code text, name text, phone text, email text, taps text[], consent boolean, on_date date default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  ex exhibitors%rowtype; st jsonb; allowed text[]; clean text[]; key text; who uuid; existing uuid; found_n int;
  nm text := btrim(coalesce(name, '')); em text := nullif(lower(btrim(coalesce(email, ''))), '');
  day date := (now() at time zone 'Asia/Jerusalem')::date;
  words text[];
begin
  if current_phase() = 'after' then raise exception 'closed'; end if;
  select * into ex from exhibitors where join_code = lower(code) and approved;
  if not found then raise exception 'no such booth'; end if;
  select data into st from setups where exhibitor_id = ex.id and active;
  if st is null then raise exception 'no such booth'; end if;

  key := phone_key(phone);
  if length(nm) < 2 or length(nm) > 80 then raise exception 'name'; end if;
  if key is null or length(key) not between 9 and 10 or left(key, 1) <> '0' then raise exception 'phone'; end if;
  if em is not null and (length(em) > 120 or em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then raise exception 'email'; end if;
  if on_date is not null and (on_date < day or on_date > day + 3 * 365) then on_date := null; end if;
  if (select count(*) from leads where exhibitor_id = ex.id and source = 'self' and captured_at > now() - interval '10 minutes') >= 40 then
    raise exception 'busy';
  end if;

  select array_agg(x) into allowed from (
    select n ->> 'label' x from jsonb_array_elements(st -> 'needs') n
    union select w ->> 'label' from jsonb_array_elements(st -> 'when') w
    union select w ->> 'label' from jsonb_array_elements(st -> 'who') w
  ) a;
  select coalesce(array_agg(distinct t), '{}') into clean from unnest(coalesce(taps, '{}')) t where t = any (allowed);
  if ex.sensitive and consent then clean := clean || 'מסכים לקבל עדכונים'; end if;

  if current_phase() <> 'practice' then
    select array_agg(w) into words from unnest(regexp_split_to_array(nm, '\s+')) w where length(w) > 1;
    select (array_agg(p.id))[1], count(*) into who, found_n from people p
    where phone_key(p.phone) = key
      and (select count(*) from unnest(words) w where w = any (regexp_split_to_array(btrim(p.full_name), '\s+'))) >= least(2, coalesce(cardinality(words), 0))
      and coalesce(cardinality(words), 0) > 0;
    if found_n <> 1 then who := null; end if;
  end if;

  select l.id into existing from leads l left join people p on p.id = l.person_id
  where l.exhibitor_id = ex.id and l.captured_on = day
    and (l.person_id = who or phone_key(coalesce(p.phone, l.typed_phone)) = key)
  limit 1;

  if existing is not null then
    update leads set taps = (select coalesce(array_agg(distinct t), '{}') from unnest(leads.taps || clean) t),
      typed_email = coalesce(em, typed_email),
      list_consent = list_consent or (ex.sensitive and consent),
      customer_date = coalesce(customer_date, on_date)
    where id = existing;
    delete from tasks where lead_id = existing;  -- the exhibitor's app computes it again with the new taps
    return jsonb_build_object('ok', true, 'again', true);
  end if;

  insert into leads (id, exhibitor_id, person_id, typed_name, typed_phone, typed_email, taps, list_consent, source, customer_date)
  values (gen_random_uuid(), ex.id, who, nm, key, em, clean, ex.sensitive and consent, 'self', on_date);
  return jsonb_build_object('ok', true, 'again', false);
end $$;

-- The mail the visitor typed himself comes before the list's.
create or replace function lead_own(lead uuid) returns table (phone text, email text, wa boolean)
language sql stable security definer set search_path = public as $$
  select phone_key(coalesce(p.phone, l.typed_phone)), lower(btrim(coalesce(l.typed_email, p.email))),
    case when p.phone is not null then p.has_whatsapp else l.typed_whatsapp end
  from leads l left join people p on p.id = l.person_id where l.id = lead
$$;

-- A trial message reaches him even when he cleared the mail in his details: the mail he signed in with.
create or replace function trial_dests(ex uuid) returns table (kind text, value text)
language sql stable security definer set search_path = public as $$
  select 'phone'::text, phone_key(e.whatsapp) from exhibitors e where e.id = ex and phone_key(e.whatsapp) is not null
  union
  select 'email', lower(btrim(coalesce(nullif(btrim(e.email), ''), u.email))) from exhibitors e join auth.users u on u.id = e.owner
  where e.id = ex and coalesce(nullif(btrim(e.email), ''), u.email) is not null
  union
  select case when v like '%@%' then 'email' else 'phone' end, case when v like '%@%' then lower(btrim(v)) else phone_key(v) end
  from exhibitors e cross join unnest(e.trial_to) v where e.id = ex and nullif(btrim(v), '') is not null
    and (v !~ '@' or btrim(v) ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
$$;

-- ---------- "הסר" in WhatsApp always counts (יצחק, 30/10): without "לקרוא תשובות" only the word is looked at, and
-- nothing of the message is kept but the fact that he asked
drop function wa_lead_phones(text);
create function wa_lead_phones(key text) returns table (exhibitor_id uuid, phones text[], reads boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  return query
  select e.id, array_agg(distinct x.num) filter (where x.num is not null), e.wa_read_replies
  from exhibitors e join (
    select l.exhibitor_id ex, phone_key(coalesce(p.phone, l.typed_phone)) num from leads l left join people p on p.id = l.person_id
    union all
    select c.exhibitor_id, c.value from lead_contacts c where c.kind = 'phone'
  ) x on x.ex = e.id
  group by e.id;
end $$;
create or replace function wa_inbound(key text, exhibitor uuid, phone text, body text)
returns uuid language plpgsql security definer set search_path = public as $$
#variable_conflict use_variable
declare lid uuid; raw text; is_out boolean; reads boolean;
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  reads := coalesce((select wa_read_replies from exhibitors where id = exhibitor), false);
  is_out := btrim(body) ~* '^(הסר|הסירו|להסיר|הסרה|תסירו|stop)[.!\s]*$';
  if not reads and not is_out then return null; end if;
  select l.id, case when phone_key(coalesce(p.phone, l.typed_phone)) = phone_key(phone) then coalesce(p.phone, l.typed_phone) else phone_key(phone) end
  into lid, raw
  from leads l left join people p on p.id = l.person_id
  where l.exhibitor_id = exhibitor
    and (phone_key(coalesce(p.phone, l.typed_phone)) = phone_key(phone)
      or exists (select 1 from lead_contacts c where c.lead_id = l.id and c.kind = 'phone' and c.value = phone_key(phone)))
  order by l.captured_at desc limit 1;
  if lid is null then return null; end if;
  insert into lead_replies (exhibitor_id, lead_id, body, optout) values (exhibitor, lid, case when reads then left(body, 2000) else 'הסר · בוואטסאפ' end, is_out);
  if reads or is_out then
    update outbox set status = 'cancelled', error = 'replied' where lead_id = lid and step_id is not null and status = 'queued';
  end if;
  if is_out then
    insert into opt_outs (exhibitor_id, phone, by_visitor) values (exhibitor, raw, true);
    update leads set opted_out = true where id = lid;
    update outbox set status = 'cancelled', error = 'opted_out' where lead_id = lid and status = 'queued';
  end if;
  return lid;
end $$;
create or replace function mail_unsubscribe(key text, item uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare lid uuid; ex uuid; em text; was boolean;
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  select o.lead_id, o.exhibitor_id, lower(o.to_email), l.opted_out into lid, ex, em, was
  from outbox o join leads l on l.id = o.lead_id where o.id = item and o.channel = 'email';
  if lid is null then return false; end if;
  if was then return true; end if;
  if not exists (select 1 from opt_outs x where x.exhibitor_id = ex and lower(x.email) = em) then
    insert into opt_outs (exhibitor_id, email, by_visitor) values (ex, em, true);
  end if;
  update leads set opted_out = true where id = lid;
  insert into lead_replies (exhibitor_id, lead_id, body, optout) values (ex, lid, 'הסר · מהקישור במייל', true);
  update outbox set status = 'cancelled', error = 'opted_out' where lead_id = lid and status = 'queued';
  return true;
end $$;

-- ---------- the queues
-- A send that failed for a passing reason (a dropped connection, a server error) is tried again later, up to five
-- times, instead of being marked failed for good, which froze the lead's whole path.
alter table outbox add column attempts int not null default 0;
create function send_retry(key text, item uuid, err text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  update outbox set attempts = attempts + 1, error = left(err, 200),
    status = case when attempts + 1 >= 5 then 'failed' else 'queued' end,
    not_before = now() + make_interval(mins => least(60, 2 ^ (attempts + 1))::int)
  where id = item and status = 'queued';
end $$;
revoke all on function send_retry(text, uuid, text) from public, authenticated;
grant execute on function send_retry(text, uuid, text) to anon;

create index outbox_waiting on outbox (channel, created_at) where status = 'queued';
create index outbox_first_today on outbox (exhibitor_id, sent_at) where status = 'sent' and first_contact;

-- WhatsApp: a few rows of each booth at a time, not the 200 oldest of all (one booth's backlog held up every other
-- booth); only approved booths; a removal of a trial destination counts too. Today's first contacts once per booth.
drop function wa_queue(text, int);
create function wa_queue(key text, max_rows int default 50)
returns table (id uuid, exhibitor_id uuid, lead_id uuid, body text, phone text, name text, first_contact boolean, save_contact boolean, first_today int, known boolean, files text[], trial boolean)
language plpgsql security definer set search_path = public as $$
declare ph text := current_phase();
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  update outbox o set status = 'cancelled', error = 'opted_out'
  from leads l left join people p on p.id = l.person_id
  where o.lead_id = l.id and o.status = 'queued' and o.channel = 'whatsapp'
    and ((not o.trial and l.opted_out) or exists (
      select 1 from opt_outs x where (x.exhibitor_id = l.exhibitor_id or x.exhibitor_id is null) and x.phone is not null
        and phone_key(x.phone) = coalesce(o.to_phone, phone_key(coalesce(p.phone, l.typed_phone)))));
  return query
  with ready as (
    select o.*, row_number() over (partition by o.exhibitor_id order by o.created_at) n
    from outbox o join exhibitors e on e.id = o.exhibitor_id join leads l on l.id = o.lead_id
    where o.status = 'queued' and o.channel = 'whatsapp' and o.not_before <= now() and e.wa_blocked_at is null and e.approved
      and case when o.trial then ph = 'practice' and l.practice else ph in ('live', 'after') and not l.practice end
  ),
  firsts as (
    select s.exhibitor_id ex, count(*)::int c from outbox s
    where s.status = 'sent' and s.first_contact and s.channel = 'whatsapp'
      and s.sent_at >= (date_trunc('day', now() at time zone 'Asia/Jerusalem') at time zone 'Asia/Jerusalem')
    group by s.exhibitor_id
  )
  select o.id, o.exhibitor_id, o.lead_id, o.body, coalesce(o.to_phone, own.phone),
    coalesce(l.typed_name, p.full_name),
    not exists (select 1 from lead_replies r where r.lead_id = o.lead_id),
    e.wa_save_contacts and o.to_phone is null,
    coalesce(f.c, 0),
    coalesce(case when o.to_phone is null then own.wa else c.has_whatsapp end, false),
    o.files,
    o.trial
  from ready o
  join leads l on l.id = o.lead_id
  left join people p on p.id = l.person_id
  cross join lateral lead_own(l.id) own
  left join lead_contacts c on c.lead_id = o.lead_id and c.kind = 'phone' and c.value = o.to_phone
  join exhibitors e on e.id = o.exhibitor_id
  left join firsts f on f.ex = o.exhibitor_id
  where o.n <= 5
  order by o.created_at
  limit max_rows;
end $$;

-- Mail: only approved booths, a removal of a trial destination counts too, and his own name before the @.
drop function mail_queue(text, int);
create function mail_queue(key text, max_rows int default 50)
returns table (id uuid, to_email text, body text, from_name text, reply_to text, subject text, files text[], trial boolean,
  sensitive boolean, logo text, brand_color text, phone text, whatsapp text, mail_name text)
language plpgsql security definer set search_path = public as $$
declare ph text := current_phase();
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  update outbox o set status = 'cancelled', error = 'opted_out'
  from leads l
  where o.lead_id = l.id and o.status = 'queued' and o.channel = 'email'
    and ((not o.trial and l.opted_out) or exists (select 1 from opt_outs x where (x.exhibitor_id = l.exhibitor_id or x.exhibitor_id is null) and lower(x.email) = lower(o.to_email)));
  return query
  select o.id, o.to_email, o.body, e.name,
    coalesce(nullif(btrim(e.email), ''), (select u.email from auth.users u where u.id = e.owner)),
    case when x.sens then e.name else coalesce(nullif(btrim(e.business), ''), e.name) end,
    o.files,
    o.trial,
    x.sens,
    case when x.sens then null else e.logo end,
    e.brand_color,
    nullif(btrim(e.phone), ''),
    nullif(btrim(e.whatsapp), ''),
    e.mail_name
  from outbox o join leads l on l.id = o.lead_id join exhibitors e on e.id = o.exhibitor_id
  cross join lateral (select e.sensitive or coalesce((select (s.data->>'sensitive')::boolean from setups s where s.exhibitor_id = e.id and s.active limit 1), false) as sens) x
  where o.status = 'queued' and o.channel = 'email' and o.to_email is not null and o.not_before <= now() and e.approved
    and case when o.trial then ph = 'practice' and l.practice else ph in ('live', 'after') and not l.practice end
  order by o.created_at
  limit max_rows;
end $$;
revoke all on function wa_queue(text, int), mail_queue(text, int), wa_lead_phones(text) from public, authenticated;
grant execute on function wa_queue(text, int), mail_queue(text, int), wa_lead_phones(text) to anon;

-- ---------- the public files: price lists, forms and pictures, not pages
update storage.buckets set allowed_mime_types = array[
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv'
] where id = 'files';

-- ---------- 0029's trigger, as the security check asks
alter function trial_fast_mark() set search_path = public;
revoke execute on function trial_fast_mark() from public, anon, authenticated;
