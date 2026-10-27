-- A button that asks "מתי?" (a wedding, an event) gets the date on the self-registration page too, as at the booth.
drop function join_booth(text, text, text, text, text[], boolean);
create function join_booth(code text, name text, phone text, email text, taps text[], consent boolean, on_date date default null)
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

revoke execute on function join_booth(text, text, text, text, text[], boolean, date) from public;
grant execute on function join_booth(text, text, text, text, text[], boolean, date) to anon, authenticated;
