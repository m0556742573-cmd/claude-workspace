-- Self-registration at the booth: a visitor scans the booth's code, types his name and phone, and taps what interests him.
-- The page is open to anyone who has the link, so everything goes through two functions, and nothing else is open:
-- join_info shows the booth's name and its card buttons; join_booth saves one visitor. Neither reveals the community list.

alter table exhibitors add column join_code text unique;
alter table leads add column typed_email text;
alter table leads add column source text not null default 'booth' check (source in ('booth', 'self'));

-- A short code for the link: letters and digits that are not mistaken for each other on a printed sign.
create function new_join_code() returns text language plpgsql volatile set search_path = public as $$
declare abc constant text := 'abcdefghjkmnpqrstuvwxyz23456789'; c text;
begin
  loop
    c := '';
    for i in 1..6 loop c := c || substr(abc, 1 + floor(random() * length(abc))::int, 1); end loop;
    exit when not exists (select 1 from exhibitors where join_code = c);
  end loop;
  return c;
end $$;

update exhibitors set join_code = new_join_code() where join_code is null;
alter table exhibitors alter column join_code set default new_join_code();
alter table exhibitors alter column join_code set not null;

-- Phones compared by their digits, the Israeli way: 972-50… and 050… are the same number.
create function phone_key(p text) returns text language sql immutable as $$
  select nullif(regexp_replace(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '^972', '0'), '')
$$;

-- What the page shows: the booth's name and the three questions of its card. Only an approved booth with a setup.
create function join_info(code text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'name', e.name,
    'business', case when e.sensitive then '' else e.business end,
    'sensitive', e.sensitive,
    'needs', coalesce((select jsonb_agg(n ->> 'label') from jsonb_array_elements(s.data -> 'needs') n), '[]'),
    'when', coalesce((select jsonb_agg(w ->> 'label') from jsonb_array_elements(s.data -> 'when') w), '[]'),
    'who', coalesce((select jsonb_agg(w ->> 'label') from jsonb_array_elements(s.data -> 'who') w), '[]')
  )
  from exhibitors e join setups s on s.exhibitor_id = e.id and s.active
  where e.join_code = lower(code) and e.approved
$$;

-- Saves one visitor. The same phone at the same booth on the same day is one lead: what he taps again is added to it,
-- also when the exhibitor already registered him by hand. A name that matches the community list (same phone, and a
-- word of the name in common) is linked to it, so the exhibitor sees the name he knows. Only buttons that are on the
-- card are kept. At most 40 self-registrations a booth in ten minutes, against a flood.
create function join_booth(code text, name text, phone text, email text, taps text[], consent boolean)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  ex exhibitors%rowtype; st jsonb; allowed text[]; clean text[]; key text; who uuid; existing uuid;
  nm text := btrim(coalesce(name, '')); em text := nullif(lower(btrim(coalesce(email, ''))), '');
  day date := (now() at time zone 'Asia/Jerusalem')::date;
begin
  select * into ex from exhibitors where join_code = lower(code) and approved;
  if not found then raise exception 'no such booth'; end if;
  select data into st from setups where exhibitor_id = ex.id and active;
  if st is null then raise exception 'no such booth'; end if;

  key := phone_key(phone);
  if length(nm) < 2 or length(nm) > 80 then raise exception 'name'; end if;
  if key is null or length(key) not between 9 and 10 or left(key, 1) <> '0' then raise exception 'phone'; end if;
  if em is not null and (length(em) > 120 or em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then raise exception 'email'; end if;
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

  select p.id into who from people p
  where phone_key(p.phone) = key
    and exists (select 1 from unnest(string_to_array(nm, ' ')) w where length(w) > 1 and position(w in p.full_name) > 0)
  limit 1;

  select l.id into existing from leads l left join people p on p.id = l.person_id
  where l.exhibitor_id = ex.id and l.captured_on = day
    and (l.person_id = who or phone_key(coalesce(p.phone, l.typed_phone)) = key)
  limit 1;

  if existing is not null then
    update leads set taps = (select coalesce(array_agg(distinct t), '{}') from unnest(leads.taps || clean) t),
      typed_email = coalesce(typed_email, em),
      list_consent = list_consent or (ex.sensitive and consent)
    where id = existing;
    delete from tasks where lead_id = existing;  -- the exhibitor's app computes it again with the new taps
    return jsonb_build_object('ok', true, 'again', true);
  end if;

  insert into leads (id, exhibitor_id, person_id, typed_name, typed_phone, typed_email, taps, list_consent, source)
  values (gen_random_uuid(), ex.id, who, nm, key, em, clean, ex.sensitive and consent, 'self');
  return jsonb_build_object('ok', true, 'again', false);
end $$;

revoke execute on function join_info(text), join_booth(text, text, text, text, text[], boolean), new_join_code(), phone_key(text) from public;
grant execute on function join_info(text), join_booth(text, text, text, text, text[], boolean) to anon, authenticated;

-- The mail typed by a visitor who registered himself counts like the community list's.
drop function lead_contact(uuid);
create function lead_contact(lead uuid)
returns table (phone text, email text, has_whatsapp boolean, opted_out boolean)
language sql stable security definer set search_path = public as $$
  select coalesce(p.phone, l.typed_phone), coalesce(p.email, l.typed_email), p.has_whatsapp,
    exists (
      select 1 from opt_outs o
      where (o.exhibitor_id = l.exhibitor_id or o.exhibitor_id is null)
        and ((o.phone is not null and o.phone = coalesce(p.phone, l.typed_phone)) or (o.email is not null and o.email = coalesce(p.email, l.typed_email)))
    )
  from leads l left join people p on p.id = l.person_id
  where l.id = lead and l.exhibitor_id = my_exhibitor()
$$;

create or replace function my_lead_contacts()
returns table (lead_id uuid, phone text, email text)
language sql stable security definer set search_path = public as $$
  select l.id, coalesce(p.phone, l.typed_phone), coalesce(p.email, l.typed_email)
  from leads l left join people p on p.id = l.person_id
  where l.exhibitor_id = my_exhibitor()
$$;

create or replace function opt_out_lead(lead uuid, asked boolean) returns void language plpgsql security definer set search_path = public as $$
declare c record;
begin
  select coalesce(p.phone, l.typed_phone) as phone, coalesce(p.email, l.typed_email) as email into c
  from leads l left join people p on p.id = l.person_id
  where l.id = lead and l.exhibitor_id = my_exhibitor();
  if not found then raise exception 'not allowed'; end if;
  if asked then
    if c.phone is not null or c.email is not null then
      insert into opt_outs (exhibitor_id, phone, email) values (my_exhibitor(), c.phone, c.email);
    end if;
  else
    delete from opt_outs o where o.exhibitor_id = my_exhibitor()
      and (o.phone is not distinct from c.phone) and (o.email is not distinct from c.email);
  end if;
end $$;

revoke execute on function lead_contact(uuid), my_lead_contacts(), opt_out_lead(uuid, boolean) from public, anon;
grant execute on function lead_contact(uuid), my_lead_contacts(), opt_out_lead(uuid, boolean) to authenticated;

-- Supabase grants new functions to anon and authenticated by name; the two helpers stay inside the database.
revoke execute on function new_join_code(), phone_key(text) from anon, authenticated;
