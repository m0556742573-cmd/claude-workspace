-- 0033 broke wa_plan_queue: its argument "wa" and lead_own's column "wa" had the same name, so every queueing of a
-- path's step failed (30/10, seen in the server's log within the hour). The argument is meant.
create or replace function wa_plan_queue(key text, lead uuid, step text, template text, body text, wa boolean default true, mail boolean default false,
  files text[] default null, fast_day date default null)
returns boolean language plpgsql security definer set search_path = public as $$
#variable_conflict use_variable
declare tr boolean; pre text := '';
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
  insert into outbox (exhibitor_id, lead_id, channel, template_id, body, status, step_id, to_phone, to_email, files, trial, virtual_on)
  select l.exhibitor_id, l.id, 'whatsapp', template, pre || body, 'queued', step, t.to_phone, null::text, files, tr, case when tr then fast_day end
  from leads l cross join lateral wa_targets(l.id) t where wa and l.id = lead
  union all
  select l.exhibitor_id, l.id, 'email', template, pre || body, 'queued', step, null::text, m.to_email, files, tr, case when tr then fast_day end
  from leads l cross join lateral mail_targets(l.id) m cross join lateral lead_own(l.id) own
  where mail and l.id = lead
    and not (wa and not tr and m.to_email = own.email and own.wa is null and coalesce(l.own_phone_on, true) and own.phone is not null);
  return found;
end $$;
