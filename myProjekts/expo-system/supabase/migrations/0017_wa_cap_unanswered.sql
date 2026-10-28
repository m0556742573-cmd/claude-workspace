-- 0017: the daily cap counts every message to someone who has not written back, not only the first one
-- (יצחק, 28/10: no bursts; a second and third follow-up to the same silent visitors are as much a burst as the first).
-- Only a conversation where he answered is outside the cap; it still keeps the gap between sends.
create or replace function wa_queue(key text, max_rows int default 50)
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
    not exists (select 1 from lead_replies r where r.lead_id = o.lead_id),
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
revoke all on function wa_queue(text, int) from public, authenticated;
grant execute on function wa_queue(text, int) to anon;
