-- The exhibitor's own look (יצחק, 30/10): his logo and his colour, both optional. They head every mail he sends, his
-- self-registration page and its sign. The logo is a PNG the app makes from whatever he uploads (mail services do not
-- show SVG), kept in his own folder of the public files bucket; the colour is suggested from the logo and can be changed.
-- A business marked sensitive shows neither in the mail: only his name, as in its subject.
alter table exhibitors
  add column logo text check (logo ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.png$'),
  add column brand_color text check (brand_color ~ '^#[0-9a-fA-F]{6}$');
grant update (logo, brand_color) on exhibitors to authenticated;

-- The mail queue also carries what the mail's header and contact card need.
drop function mail_queue(text, int);
create function mail_queue(key text, max_rows int default 50)
returns table (id uuid, to_email text, body text, from_name text, reply_to text, subject text, files text[], trial boolean,
  sensitive boolean, logo text, brand_color text, phone text, whatsapp text)
language plpgsql security definer set search_path = public as $$
declare ph text := current_phase();
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  update outbox o set status = 'cancelled', error = 'opted_out'
  from leads l
  where o.lead_id = l.id and o.status = 'queued' and o.channel = 'email' and not o.trial
    and (l.opted_out or exists (select 1 from opt_outs x where (x.exhibitor_id = l.exhibitor_id or x.exhibitor_id is null) and lower(x.email) = lower(o.to_email)));
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
    nullif(btrim(e.whatsapp), '')
  from outbox o join leads l on l.id = o.lead_id join exhibitors e on e.id = o.exhibitor_id
  cross join lateral (select e.sensitive or coalesce((select (s.data->>'sensitive')::boolean from setups s where s.exhibitor_id = e.id and s.active limit 1), false) as sens) x
  where o.status = 'queued' and o.channel = 'email' and o.to_email is not null and (o.not_before is null or o.not_before <= now())
    and case when o.trial then ph = 'practice' and l.practice else ph in ('live', 'after') and not l.practice end
  order by o.created_at
  limit max_rows;
end $$;

-- The self-registration page shows his logo and colour too (not in a sensitive business).
create or replace function join_info(code text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'name', e.name,
    'business', case when e.sensitive then '' else e.business end,
    'sensitive', e.sensitive,
    'logo', case when e.sensitive then null else e.logo end,
    'color', e.brand_color,
    'needs', coalesce((select jsonb_agg(n ->> 'label') from jsonb_array_elements(s.data -> 'needs') n), '[]'),
    'when', coalesce((select jsonb_agg(w ->> 'label') from jsonb_array_elements(s.data -> 'when') w), '[]'),
    'who', coalesce((select jsonb_agg(w ->> 'label') from jsonb_array_elements(s.data -> 'who') w), '[]')
  )
  from exhibitors e join setups s on s.exhibitor_id = e.id and s.active
  where e.join_code = lower(code) and e.approved
$$;

revoke all on function mail_queue(text, int) from public, authenticated;
grant execute on function mail_queue(text, int) to anon;
