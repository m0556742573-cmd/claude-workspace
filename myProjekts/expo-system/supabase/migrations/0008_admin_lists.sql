-- The admin loads the two lists from a file, in the browser; the rows go straight to the server, never through git.

-- The organisers' exhibitor list: whoever is on it opens a booth without waiting. Someone already signed up and waiting
-- whose mail is on the list is approved now.
create function admin_load_exhibitor_list(rows jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare added int; approved_now int;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  insert into exhibitor_list (email, name, business)
  select lower(trim(r ->> 'email')), nullif(trim(r ->> 'name'), ''), nullif(trim(r ->> 'business'), '')
  from jsonb_array_elements(rows) r
  where coalesce(trim(r ->> 'email'), '') like '%@%'
  on conflict (email) do update set name = coalesce(excluded.name, exhibitor_list.name), business = coalesce(excluded.business, exhibitor_list.business);
  get diagnostics added = row_count;
  update exhibitors e set approved = true, business = case when e.business = '' then coalesce(l.business, '') else e.business end
  from exhibitor_list l where lower(e.email) = l.email and not e.approved;
  get diagnostics approved_now = row_count;
  return jsonb_build_object('rows', added, 'approved', approved_now);
end $$;

-- The community list, loaded in parts. A person already in it (same name and phone) is not added twice.
create function admin_load_people(rows jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare added int;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  insert into people (full_name, city, phone, email, business_owner, business_name)
  select distinct on (i.full_name, i.phone) i.full_name, i.city, i.phone, i.email, i.business_owner, i.business_name
  from (
    select trim(r ->> 'full_name') as full_name, nullif(trim(r ->> 'city'), '') as city,
           nullif(regexp_replace(coalesce(r ->> 'phone', ''), '[^0-9+]', '', 'g'), '') as phone,
           nullif(lower(trim(r ->> 'email')), '') as email,
           coalesce((r ->> 'business_owner')::boolean, false) as business_owner,
           nullif(trim(r ->> 'business_name'), '') as business_name
    from jsonb_array_elements(rows) r
    where coalesce(trim(r ->> 'full_name'), '') <> ''
  ) i
  where not exists (select 1 from people p where p.full_name = i.full_name and p.phone is not distinct from i.phone);
  get diagnostics added = row_count;
  return jsonb_build_object('added', added, 'total', (select count(*) from people));
end $$;

-- Before loading a new list in place of the old one (the sample names): whoever was never registered at a booth leaves.
-- A registered visitor stays, so no booth loses a lead; the new list then adds everyone else.
create function admin_clear_people() returns int language plpgsql security definer set search_path = public as $$
declare removed int;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  delete from people p where not exists (select 1 from leads l where l.person_id = p.id);
  get diagnostics removed = row_count;
  return removed;
end $$;

create function admin_counts() returns jsonb language sql stable security definer set search_path = public as $$
  select case when is_admin() then jsonb_build_object('people', (select count(*) from people), 'listed', (select count(*) from exhibitor_list)) end
$$;

revoke execute on function admin_load_exhibitor_list(jsonb), admin_load_people(jsonb), admin_clear_people(), admin_counts() from public, anon;
grant execute on function admin_load_exhibitor_list(jsonb), admin_load_people(jsonb), admin_clear_people(), admin_counts() to authenticated;
