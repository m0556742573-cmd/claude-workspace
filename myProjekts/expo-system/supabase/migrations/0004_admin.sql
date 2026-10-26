-- The expo's admin: sees every booth, approves the ones not on the organisers' list.
create table admins (email text primary key);
alter table admins enable row level security;  -- server side only

create function is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where lower(email) = lower(auth.jwt() ->> 'email'))
$$;

create function admin_exhibitors()
returns table (id uuid, name text, email text, business text, approved boolean, created_at timestamptz, leads bigint)
language sql stable security definer set search_path = public as $$
  select e.id, e.name, e.email, e.business, e.approved, e.created_at, (select count(*) from leads l where l.exhibitor_id = e.id)
  from exhibitors e where is_admin() order by e.approved, e.created_at desc
$$;

create function admin_approve(exhibitor uuid, ok boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  update exhibitors set approved = ok where id = exhibitor;
end $$;

revoke execute on function is_admin(), admin_exhibitors(), admin_approve(uuid, boolean) from public, anon;
grant execute on function is_admin(), admin_exhibitors(), admin_approve(uuid, boolean) to authenticated;
