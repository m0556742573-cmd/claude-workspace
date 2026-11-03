-- 0045: the community list closes by a button in the admin, not by a date, and the admin can keep it open for one
-- exhibitor (יצחק, 3/11: "תחיל את הסגירה אבל בכפתור בניהול ולא לפי תאריך או לפחות שאני אוכל למנוע את זה לפי משתמש
-- גם"). This replaces the date of 1/11 (the list closed by itself on 19/11); 0045 was rewritten before it was ever
-- applied.
-- What closing means stays as on 1/11 ("אחרי יומיים של האקספו אין יותר מספרים ואימיילים חדשים, רק מה שנאסף קודם, וכל
-- חדש חייב הכנסה לבד"): from the moment the admin closes it, an exhibitor finds no one in the list, and a visitor recorded
-- from then on is linked to no one in it: he is kept by his name, and his phone or mail are typed. What was gathered
-- before stays as it is. The admin keeps the list. Opening it again opens it to everyone; a visitor who lost his link
-- while it was closed does not get it back.
-- The app reads list_closed_at (system_state) and, once it is set, list_keep_open from the exhibitor's own row, every 30
-- seconds with the phase: to stop searching the copy of the list the tablet already holds, and to say why the search is
-- empty.

-- null: open. Set by admin_set_list below, nowhere else.
alter table system_state add column list_closed_at timestamptz;
grant select (list_closed_at) on system_state to anon, authenticated;

-- The admin's exception for one exhibitor. He reads it with his own row (own_read); he may not change it: 0026 took the
-- table's update away from exhibitors and gives it back column by column, and this column is not given.
alter table exhibitors add column list_keep_open boolean not null default false;
revoke update (list_keep_open) on exhibitors from authenticated;

-- Whether exhibitor exh may use the list at a given time: yes while it is not closed, for whatever was recorded before
-- the closing, and always for an exhibitor the admin kept it open for.
create function list_open_for(exh uuid, at timestamptz default now()) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from system_state s
                     where s.id = 1 and s.list_closed_at is not null and coalesce(at, now()) >= s.list_closed_at)
    or exists (select 1 from exhibitors e where e.id = exh and e.list_keep_open)
$$;

-- Closed, the directory keeps the visitors he already gathered from it: the app takes their names, cities and "בעל עסק"
-- from it (his leads keep only the link), so without them his CRM would show "מבקר" for everyone he met. It gives him no
-- one new; the app does not search it while the list is closed.
create or replace function people_directory()
returns table (id uuid, full_name text, city text, business_owner boolean, father text, father_in_law text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.city, p.business_owner, p.father, p.father_in_law from people p
  where my_exhibitor() is not null and (current_phase() <> 'practice' or is_admin())
    and (list_open_for(my_exhibitor()) or is_admin()
         or p.id in (select l.person_id from leads l where l.exhibitor_id = my_exhibitor()))
$$;

create or replace function search_people(q text, max int default 12)
returns table (id uuid, full_name text, city text, business_owner boolean)
language sql stable security definer set search_path = public, extensions as $$
  select p.id, p.full_name, p.city, p.business_owner
  from people p
  where my_exhibitor() is not null and (current_phase() <> 'practice' or is_admin())
    and (list_open_for(my_exhibitor()) or is_admin())
    and length(trim(q)) >= 2
    and (p.full_name % q or p.full_name ilike '%' || trim(q) || '%')
  order by similarity(p.full_name, q) desc
  limit least(max, 30)
$$;

-- A tablet keeps its copy of the list, so the closing is kept here too: a visitor linked to the list after it closed
-- keeps only his name. One recorded before it closed keeps his link, even when the tablet sends him later; the time is
-- the tablet's own (captured_at). A link that does not change is left alone; a link that changes is judged by now.
-- Self-registration (join_booth) inserts too, so it is held by the same rule.
create function leads_list_closed() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.person_id is null or is_admin() then return new; end if;
  if tg_op = 'UPDATE' and new.person_id is not distinct from old.person_id then return new; end if;
  if list_open_for(new.exhibitor_id, case when tg_op = 'INSERT' then new.captured_at else now() end) then return new; end if;
  new.typed_name := coalesce(nullif(btrim(new.typed_name), ''), (select p.full_name from people p where p.id = new.person_id));
  new.person_id := null;
  return new;
end $$;
create trigger leads_list_closed before insert or update of person_id on leads for each row execute function leads_list_closed();

-- The admin's two buttons. Closing keeps the first closing time when pressed again; opening clears it. Returns the
-- closing time (null: open).
create function admin_set_list(closed boolean) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare since timestamptz;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  update system_state set list_closed_at = case when closed then coalesce(list_closed_at, now()) end where id = 1
  returning list_closed_at into since;
  return since;
end $$;

create function admin_list_keep_open(exhibitor uuid, keep boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  update exhibitors set list_keep_open = keep where id = exhibitor;
  if not found then raise exception 'no such exhibitor'; end if;
end $$;

-- The admin's list of exhibitors shows the exception too (a new column: the function is made again).
drop function admin_exhibitors();
create function admin_exhibitors()
returns table (id uuid, name text, email text, business text, approved boolean, created_at timestamptz, leads bigint, list_keep_open boolean)
language sql stable security definer set search_path = public as $$
  select e.id, e.name, coalesce((select u.email from auth.users u where u.id = e.owner), e.email), e.business, e.approved, e.created_at,
    (select count(*) from leads l where l.exhibitor_id = e.id), e.list_keep_open
  from exhibitors e where is_admin() order by e.approved, e.created_at desc
$$;

-- list_open_for and the trigger run only inside the functions above (as their owner); nobody calls them directly.
revoke all on function list_open_for(uuid, timestamptz), leads_list_closed() from public, anon, authenticated;
revoke all on function admin_set_list(boolean), admin_list_keep_open(uuid, boolean), admin_exhibitors() from public, anon;
grant execute on function admin_set_list(boolean), admin_list_keep_open(uuid, boolean), admin_exhibitors() to authenticated;
revoke all on function people_directory(), search_people(text, int) from public, anon;
grant execute on function people_directory(), search_people(text, int) to authenticated;
