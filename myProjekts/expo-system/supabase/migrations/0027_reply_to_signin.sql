-- A visitor's reply always reaches the exhibitor (יצחק, 30/10: "אין מציג בלי מייל, אחרת איך הוא נרשם").
-- The reply goes to the mail in his details, and when he cleared it there, to the mail he signed in with, so it never
-- falls on the sending address, where no one reads.
create or replace function mail_queue(key text, max_rows int default 50)
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
  select o.id, o.to_email, o.body, e.name,
    coalesce(nullif(btrim(e.email), ''), (select u.email from auth.users u where u.id = e.owner)),
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
