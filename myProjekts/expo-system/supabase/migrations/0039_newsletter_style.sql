-- The mailing list's look (יצחק, 30/10): a message the path sends before a season or a holiday is a mailing-list
-- message, a real advertisement, and it may look like one (design ג, a newsletter); the messages after a talk at the
-- booth stay letters (design ב). The planner says which, by the step's timing; the mail is drawn by it.
alter table outbox add column style text not null default 'letter' check (style in ('letter', 'newsletter'));

drop function wa_plan_queue(text, uuid, text, text, text, boolean, boolean, text[], date);
create function wa_plan_queue(key text, lead uuid, step text, template text, body text, wa boolean default true, mail boolean default false,
  files text[] default null, fast_day date default null, style text default 'letter')
returns boolean language plpgsql security definer set search_path = public as $$
#variable_conflict use_variable
declare tr boolean; pre text := ''; st text := case when style = 'newsletter' then 'newsletter' else 'letter' end;
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  select l.practice into tr from leads l where l.id = lead;
  if tr is null then return false; end if;
  if tr then
    if current_phase() <> 'practice' or not trial_lead(lead) then return false; end if;
    pre := trial_prefix(lead);
  elsif current_phase() not in ('live', 'after') then return false;
  end if;
  if exists (select 1 from outbox o where o.lead_id = lead and o.step_id = step and o.status in ('queued', 'sending', 'sent', 'failed')) then return false; end if;
  insert into outbox (exhibitor_id, lead_id, channel, template_id, body, status, step_id, to_phone, to_email, files, trial, virtual_on, style)
  select l.exhibitor_id, l.id, 'whatsapp', template, pre || body, 'queued', step, t.to_phone, null::text, files, tr, case when tr then fast_day end, st
  from leads l cross join lateral wa_targets(l.id) t where wa and l.id = lead
  union all
  select l.exhibitor_id, l.id, 'email', template, pre || body, 'queued', step, null::text, m.to_email, files, tr, case when tr then fast_day end, st
  from leads l cross join lateral mail_targets(l.id) m cross join lateral lead_own(l.id) own
  where mail and l.id = lead
    and not (wa and not tr and m.to_email = own.email and own.wa is null and coalesce(l.own_phone_on, true) and own.phone is not null);
  return found;
end $$;
revoke all on function wa_plan_queue(text, uuid, text, text, text, boolean, boolean, text[], date, text) from public, authenticated;
grant execute on function wa_plan_queue(text, uuid, text, text, text, boolean, boolean, text[], date, text) to anon;

drop function mail_queue(text, int);
create function mail_queue(key text, max_rows int default 50)
returns table (id uuid, to_email text, body text, from_name text, reply_to text, subject text, files text[], trial boolean,
  sensitive boolean, logo text, brand_color text, phone text, whatsapp text, mail_name text, style text)
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
    e.mail_name,
    o.style
  from outbox o join leads l on l.id = o.lead_id join exhibitors e on e.id = o.exhibitor_id
  cross join lateral (select e.sensitive or coalesce((select (s.data->>'sensitive')::boolean from setups s where s.exhibitor_id = e.id and s.active limit 1), false) as sens) x
  where o.status = 'queued' and o.channel = 'email' and o.to_email is not null and o.not_before <= now() and e.approved
    and case when o.trial then ph = 'practice' and l.practice else ph in ('live', 'after') and not l.practice end
  order by o.created_at
  limit max_rows;
end $$;
revoke all on function mail_queue(text, int) from public, authenticated;
grant execute on function mail_queue(text, int) to anon;
