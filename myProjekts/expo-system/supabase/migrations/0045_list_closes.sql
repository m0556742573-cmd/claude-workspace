-- 0045: the community list closes two days after the expo (יצחק, 1/11, on the board: "אחרי יומיים של האקספו אין יותר
-- מספרים ואימיילים חדשים, רק מה שנאסף קודם, וכל חדש חייב הכנסה לבד"; my reading, his "נכון"). From 19/11, Israel time,
-- an exhibitor finds no one in the list, and a visitor recorded from then on is linked to no one in it: he is kept by
-- his name, and his phone or mail are typed. What was gathered before stays as it is. The admin keeps the list.
-- The app knows the same day (app/src/lib/words.ts, LIST_CLOSES) only to say why the search is empty.

create function list_open(at timestamptz default now()) returns boolean language sql stable set search_path = public as $$
  select (at at time zone 'Asia/Jerusalem')::date < date '2026-11-19'
$$;

create or replace function people_directory()
returns table (id uuid, full_name text, city text, business_owner boolean, father text, father_in_law text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.city, p.business_owner, p.father, p.father_in_law from people p
  where my_exhibitor() is not null and (current_phase() <> 'practice' or is_admin()) and (list_open() or is_admin())
$$;

create or replace function search_people(q text, max int default 12)
returns table (id uuid, full_name text, city text, business_owner boolean)
language sql stable security definer set search_path = public, extensions as $$
  select p.id, p.full_name, p.city, p.business_owner
  from people p
  where my_exhibitor() is not null and (current_phase() <> 'practice' or is_admin()) and (list_open() or is_admin())
    and length(trim(q)) >= 2
    and (p.full_name % q or p.full_name ilike '%' || trim(q) || '%')
  order by similarity(p.full_name, q) desc
  limit least(max, 30)
$$;

-- A tablet keeps its copy of the list, so the closing is kept here too: a visitor linked to the list after it closed
-- keeps only his name. One recorded before it closed keeps his link, even when the tablet sends him later; the time is
-- the tablet's own (captured_at). A link that does not change is left alone.
create function leads_list_closed() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.person_id is null or is_admin() then return new; end if;
  if tg_op = 'UPDATE' and new.person_id is not distinct from old.person_id then return new; end if;
  if list_open(case when tg_op = 'INSERT' then new.captured_at else now() end) then return new; end if;
  new.typed_name := coalesce(nullif(btrim(new.typed_name), ''), (select p.full_name from people p where p.id = new.person_id));
  new.person_id := null;
  return new;
end $$;
create trigger leads_list_closed before insert or update of person_id on leads for each row execute function leads_list_closed();

revoke all on function list_open(timestamptz), leads_list_closed() from public, anon;
grant execute on function list_open(timestamptz) to authenticated;
revoke all on function people_directory(), search_people(text, int) from public, anon;
grant execute on function people_directory(), search_people(text, int) to authenticated;
