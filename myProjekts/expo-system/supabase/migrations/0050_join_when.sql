-- 0050 (יצחק, 6/11: "2 כן"): self-registration asks "מתי נוח שיחזרו אליך?" — a day and, if he likes, a part of the day.
-- It becomes what was agreed (leads.agreed, 0048), marked as his own ask: {action:"talk", on, part?, who:"me", asked:true}.
-- The exhibitor's call comes first that day, and the visitor's first message says "כמו שביקשת, נחזור אליך ביום …".
-- The engine works out which step of the path it takes the place of (the page does not know the path).
-- As 0031's join_booth, with two parameters more: the day (within two months, from today) and the part of the day.
-- What the exhibitor already agreed at the booth is never replaced by it.

drop function join_booth(text, text, text, text, text[], boolean, date);

create function join_booth(code text, name text, phone text, email text, taps text[], consent boolean, on_date date default null,
  call_on date default null, call_part text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  ex exhibitors%rowtype; st jsonb; allowed text[]; clean text[]; key text; who uuid; existing uuid; found_n int;
  nm text := btrim(coalesce(name, '')); em text := nullif(lower(btrim(coalesce(email, ''))), '');
  day date := (now() at time zone 'Asia/Jerusalem')::date;
  words text[];
  asked jsonb;
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
  -- His own day for the call: from today, within two months; a part of the day only from the three words.
  if call_on is not null and call_on between day and day + 60 then
    asked := jsonb_build_object('action', 'talk', 'on', call_on, 'who', 'me', 'asked', true)
      || case when call_part in ('morning', 'noon', 'evening') then jsonb_build_object('part', call_part) else '{}'::jsonb end;
  end if;
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
      customer_date = coalesce(customer_date, on_date),
      agreed = coalesce(agreed, asked)
    where id = existing;
    delete from tasks where lead_id = existing;
    return jsonb_build_object('ok', true, 'again', true);
  end if;

  insert into leads (id, exhibitor_id, person_id, typed_name, typed_phone, typed_email, taps, list_consent, source, customer_date, agreed)
  values (gen_random_uuid(), ex.id, who, nm, key, em, clean, ex.sensitive and consent, 'self', on_date, asked);
  return jsonb_build_object('ok', true, 'again', false);
end $$;
revoke all on function join_booth(text, text, text, text, text[], boolean, date, date, text) from public;
grant execute on function join_booth(text, text, text, text, text[], boolean, date, date, text) to anon, authenticated, service_role;
