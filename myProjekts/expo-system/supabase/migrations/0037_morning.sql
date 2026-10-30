-- The morning message (יצחק, 07/10 and 20/10): every morning, the exhibitor's tasks of the day, with a link straight to
-- them. By mail and by WhatsApp as he ticks, at any hour he chooses, to the mail or number he picks when he has more
-- than one. From YHM to him ("ממני אליו"): the mail goes now; WhatsApp waits for the official number.
alter table exhibitors
  add column morning_mail boolean not null default true,
  add column morning_wa boolean not null default false,
  add column morning_at time not null default '08:00',
  add column morning_email text check (morning_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add column morning_phone text,
  add column morning_sent_on date;
grant update (morning_mail, morning_wa, morning_at, morning_email, morning_phone) on exhibitors to authenticated;

-- The booths whose morning has come today and has not gone yet, each with its tasks: what is his to do today or late.
-- Practice counts only for a booth that tries with sending (its tasks are its sample visitors').
create function morning_due(key text) returns table (exhibitor_id uuid, name text, email text, tasks jsonb)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare today date := (now() at time zone 'Asia/Jerusalem')::date; ph text := current_phase();
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  return query
  select e.id, e.name, coalesce(e.morning_email, nullif(btrim(e.email), ''), u.email),
    coalesce((select jsonb_agg(jsonb_build_object('name', coalesce(l.typed_name, p.full_name), 'action', t.action, 'message', t.message,
        'late', t.due_on < today, 'due', t.due_on) order by t.due_on, coalesce(l.typed_name, p.full_name))
      from tasks t join leads l on l.id = t.lead_id left join people p on p.id = l.person_id
      where t.exhibitor_id = e.id and t.kind = 'task' and t.who = 'me' and t.due_on <= today and not l.opted_out
        and case when ph = 'practice' then l.practice else not l.practice end), '[]'::jsonb)
  from exhibitors e join auth.users u on u.id = e.owner
  where e.approved and e.morning_mail and e.morning_sent_on is distinct from today
    and (now() at time zone 'Asia/Jerusalem')::time >= e.morning_at
    and (ph in ('live', 'after') or (ph = 'practice' and e.trial_send));
end $$;

create function morning_sent(key text, exhibitor uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  update exhibitors set morning_sent_on = (now() at time zone 'Asia/Jerusalem')::date where id = exhibitor;
end $$;

revoke all on function morning_due(text), morning_sent(text, uuid) from public, authenticated;
grant execute on function morning_due(text), morning_sent(text, uuid) to anon;
