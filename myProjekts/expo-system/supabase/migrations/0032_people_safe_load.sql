-- The community list (30/10, from the full review and model §4):
-- - Loading it goes through a staging table and is committed in one step: a file that fails half way, or a garbled
--   one, never leaves a half list or replaces a good one. Replacing removes the old names only at the commit.
-- - The father's and father-in-law's names, when the list has them, are searchable at the booth (model §4: in the
--   community a name is often told apart by them).

alter table people add column father text, add column father_in_law text;

create table people_staging (
  full_name text not null, city text, phone text, email text, business_owner boolean not null default false,
  business_name text, father text, father_in_law text
);
alter table people_staging enable row level security; -- the admin's functions only

-- One part of the file. fresh: the first part, which empties what an earlier, unfinished load left.
create function admin_people_stage(rows jsonb, fresh boolean) returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  if fresh then truncate people_staging; end if;
  insert into people_staging (full_name, city, phone, email, business_owner, business_name, father, father_in_law)
  select trim(r ->> 'full_name'), nullif(trim(r ->> 'city'), ''),
    nullif(regexp_replace(coalesce(r ->> 'phone', ''), '[^0-9+]', '', 'g'), ''),
    nullif(lower(trim(r ->> 'email')), ''),
    coalesce((r ->> 'business_owner')::boolean, false),
    nullif(trim(r ->> 'business_name'), ''), nullif(trim(r ->> 'father'), ''), nullif(trim(r ->> 'father_in_law'), '')
  from jsonb_array_elements(rows) r
  where coalesce(trim(r ->> 'full_name'), '') <> '';
  get diagnostics n = row_count;
  return n;
end $$;

-- The whole file at once. replace: whoever was never registered at a booth leaves first (a registered visitor stays, so
-- no booth loses a lead). A person already in the list (same name and phone) is not added twice.
create function admin_people_commit(replace boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare removed int := 0; added int;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  if not exists (select 1 from people_staging) then raise exception 'nothing staged'; end if;
  if replace then
    delete from people p where not exists (select 1 from leads l where l.person_id = p.id);
    get diagnostics removed = row_count;
  end if;
  insert into people (full_name, city, phone, email, business_owner, business_name, father, father_in_law)
  select distinct on (s.full_name, s.phone) s.full_name, s.city, s.phone, s.email, s.business_owner, s.business_name, s.father, s.father_in_law
  from people_staging s
  where not exists (select 1 from people p where p.full_name = s.full_name and p.phone is not distinct from s.phone);
  get diagnostics added = row_count;
  truncate people_staging;
  return jsonb_build_object('added', added, 'removed', removed, 'total', (select count(*) from people));
end $$;
revoke all on function admin_people_stage(jsonb, boolean), admin_people_commit(boolean) from public, anon;
grant execute on function admin_people_stage(jsonb, boolean), admin_people_commit(boolean) to authenticated;

drop function people_directory();
create function people_directory()
returns table (id uuid, full_name text, city text, business_owner boolean, father text, father_in_law text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.city, p.business_owner, p.father, p.father_in_law from people p
  where my_exhibitor() is not null and (current_phase() <> 'practice' or is_admin())
$$;
revoke all on function people_directory() from public, anon;
grant execute on function people_directory() to authenticated;
