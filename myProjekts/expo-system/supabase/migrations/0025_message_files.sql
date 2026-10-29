-- 0025: a file with a message (יצחק, 28/10: every message may go with a file or without). The file is a detail written
-- once (0023) whose value is a file: it is uploaded to storage under the exhibitor's own folder, its line leaves the
-- text, and it goes with every message that names it: as a document on WhatsApp, attached to the mail, or as a link
-- when he sends by a tap. The bucket is public by unguessable path: these are price lists and forms meant for the
-- visitors; only the exhibitor himself can add, replace or remove his files.

insert into storage.buckets (id, name, public, file_size_limit)
values ('files', 'files', true, 15728640)
on conflict (id) do nothing;

create policy "files: his own folder (add)" on storage.objects for insert to authenticated
  with check (bucket_id = 'files' and (storage.foldername(name))[1] = my_exhibitor()::text);
create policy "files: his own folder (replace)" on storage.objects for update to authenticated
  using (bucket_id = 'files' and (storage.foldername(name))[1] = my_exhibitor()::text);
create policy "files: his own folder (remove)" on storage.objects for delete to authenticated
  using (bucket_id = 'files' and (storage.foldername(name))[1] = my_exhibitor()::text);

-- What goes with a queued message: "path#name" for each file, as the text was filled when it was queued.
alter table outbox add column files text[];

drop function wa_plan_queue(text, uuid, text, text, text, boolean, boolean);
create function wa_plan_queue(key text, lead uuid, step text, template text, body text, wa boolean default true, mail boolean default false, files text[] default null)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  if current_phase() <> 'live' then return false; end if;
  if exists (select 1 from outbox o where o.lead_id = lead and o.step_id = step and o.status in ('queued', 'sending', 'sent', 'failed')) then return false; end if;
  insert into outbox (exhibitor_id, lead_id, channel, template_id, body, status, step_id, to_phone, to_email, files)
  select l.exhibitor_id, l.id, 'whatsapp', template, body, 'queued', step, t.to_phone, null::text, files
  from leads l cross join lateral wa_targets(l.id) t where wa and l.id = lead and not l.practice
  union all
  select l.exhibitor_id, l.id, 'email', template, body, 'queued', step, null::text, m.to_email, files
  from leads l cross join lateral mail_targets(l.id) m where mail and l.id = lead and not l.practice;
  return found;
end $$;

drop function queue_send(uuid, text, text);
create function queue_send(lead uuid, template text, body text, files text[] default null) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not exists (select 1 from leads l where l.id = lead and l.exhibitor_id = my_exhibitor()) then raise exception 'not allowed'; end if;
  insert into outbox (exhibitor_id, lead_id, channel, template_id, body, status, to_phone, files)
  select my_exhibitor(), lead, 'whatsapp', template, body, 'queued', t.to_phone, files from wa_targets(lead) t;
  get diagnostics n = row_count;
  return n;
end $$;

drop function wa_queue(text, int);
create function wa_queue(key text, max_rows int default 50)
returns table (id uuid, exhibitor_id uuid, lead_id uuid, body text, phone text, name text, first_contact boolean, save_contact boolean, first_today int, known boolean, files text[])
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
    coalesce(case when o.to_phone is null then own.wa else c.has_whatsapp end, false),
    o.files
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

drop function mail_queue(text, int);
create function mail_queue(key text, max_rows int default 50)
returns table (id uuid, to_email text, body text, from_name text, reply_to text, subject text, files text[])
language plpgsql security definer set search_path = public as $$
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  if current_phase() <> 'live' then return; end if;
  update outbox o set status = 'cancelled', error = 'opted_out'
  from leads l
  where o.lead_id = l.id and o.status = 'queued' and o.channel = 'email'
    and (l.opted_out or exists (select 1 from opt_outs x where (x.exhibitor_id = l.exhibitor_id or x.exhibitor_id is null) and lower(x.email) = lower(o.to_email)));
  return query
  select o.id, o.to_email, o.body, e.name, nullif(btrim(e.email), ''),
    case when e.sensitive or coalesce((select (s.data->>'sensitive')::boolean from setups s where s.exhibitor_id = e.id and s.active limit 1), false)
      then e.name else coalesce(nullif(btrim(e.business), ''), e.name) end,
    o.files
  from outbox o join leads l on l.id = o.lead_id join exhibitors e on e.id = o.exhibitor_id
  where o.status = 'queued' and o.channel = 'email' and o.to_email is not null and (o.not_before is null or o.not_before <= now()) and not l.practice
  order by o.created_at
  limit max_rows;
end $$;

revoke all on function wa_plan_queue(text, uuid, text, text, text, boolean, boolean, text[]), wa_queue(text, int), mail_queue(text, int) from public, authenticated;
grant execute on function wa_plan_queue(text, uuid, text, text, text, boolean, boolean, text[]), wa_queue(text, int), mail_queue(text, int) to anon;
revoke all on function queue_send(uuid, text, text, text[]) from public, anon;
grant execute on function queue_send(uuid, text, text, text[]) to authenticated;
