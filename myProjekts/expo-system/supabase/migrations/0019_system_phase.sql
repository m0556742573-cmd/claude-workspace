-- 0019: the system's phase, one for all booths, set from the admin platform (יצחק, 28/10).
--   practice: before the fair. The booth searches sample names, and nothing is sent to anyone ("במצב תרגול אין שליחות
--             ואין שמות אמיתיים"). Whatever is registered now is marked practice.
--   live:     the real thing. Moving to it can delete everything registered in practice (the admin confirms it then).
--   after:    the fair is over; the booth is closed and the CRM stays.

create table system_state (
  id int primary key default 1 check (id = 1),
  phase text not null default 'practice' check (phase in ('practice', 'live', 'after')),
  changed_at timestamptz not null default now(),
  changed_by text
);
insert into system_state default values;
alter table system_state enable row level security;
create policy read_all on system_state for select using (true);
grant select on system_state to anon, authenticated;

create function current_phase() returns text language sql stable security definer set search_path = public as $$
  select phase from system_state where id = 1
$$;

-- A lead registered in practice is marked so, and goes when the system moves to live.
alter table leads add column practice boolean not null default false;
update leads set practice = true; -- everything so far was registered before the fair, in testing
create function mark_practice() returns trigger language plpgsql security definer set search_path = public as $$
begin new.practice := current_phase() = 'practice'; return new; end $$;
create trigger leads_practice before insert on leads for each row execute function mark_practice();

-- The admin's view of the phase: what would go if he moved to live now.
create function admin_phase() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  return jsonb_build_object(
    'phase', (select phase from system_state where id = 1),
    'changed_at', (select changed_at from system_state where id = 1),
    'changed_by', (select changed_by from system_state where id = 1),
    'practice_leads', (select count(*) from leads where practice),
    'practice_booths', (select count(distinct exhibitor_id) from leads where practice)
  );
end $$;

-- Change the phase. Moving to live with drop_practice deletes every lead registered in practice, with its notes,
-- steps and messages (they cascade). That cannot be undone; the admin platform asks before it calls this.
create function admin_set_phase(to_phase text, drop_practice boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare dropped int := 0;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  if to_phase not in ('practice', 'live', 'after') then raise exception 'unknown phase'; end if;
  if to_phase = 'live' and drop_practice then
    delete from leads where practice;
    get diagnostics dropped = row_count;
  end if;
  update system_state set phase = to_phase, changed_at = now(), changed_by = auth.jwt() ->> 'email' where id = 1;
  return jsonb_build_object('phase', to_phase, 'dropped', dropped);
end $$;

-- Nothing goes out on WhatsApp unless the system is live: the queue gives nothing, and the planner cannot queue.
create or replace function wa_queue(key text, max_rows int default 50)
returns table (id uuid, exhibitor_id uuid, lead_id uuid, body text, phone text, name text, first_contact boolean, save_contact boolean, first_today int)
language plpgsql security definer set search_path = public as $$
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  if current_phase() <> 'live' then return; end if;
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
    and not l.practice
  order by o.created_at
  limit max_rows;
end $$;

create or replace function wa_plan_queue(key text, lead uuid, step text, template text, body text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  if current_phase() <> 'live' then return false; end if;
  if exists (select 1 from outbox o where o.lead_id = lead and o.step_id = step and o.status in ('queued', 'sending', 'sent', 'failed')) then return false; end if;
  insert into outbox (exhibitor_id, lead_id, channel, template_id, body, status, step_id)
  select l.exhibitor_id, l.id, 'whatsapp', template, body, 'queued', step from leads l where l.id = lead and not l.practice;
  return found;
end $$;

revoke all on function current_phase(), mark_practice(), admin_phase(), admin_set_phase(text, boolean) from public, anon;
grant execute on function current_phase(), admin_phase(), admin_set_phase(text, boolean) to authenticated;
revoke all on function wa_queue(text, int), wa_plan_queue(text, uuid, text, text, text) from public, authenticated;
grant execute on function wa_queue(text, int), wa_plan_queue(text, uuid, text, text, text) to anon;
