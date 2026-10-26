-- An exhibitor opens his own booth by signing in. Whoever is on the organisers' exhibitor list is approved at once;
-- anyone else waits for the admin's approval, because an approved booth can search the community names.
create table exhibitor_list (
  email text primary key,
  name text,
  business text
);
alter table exhibitor_list enable row level security;  -- server side only

alter table exhibitors add column approved boolean not null default false;

create function on_signup() returns trigger language plpgsql security definer set search_path = public as $$
declare listed exhibitor_list%rowtype;
begin
  select * into listed from exhibitor_list where lower(email) = lower(new.email);
  insert into exhibitors (owner, name, business, email, approved)
  values (
    new.id,
    coalesce(listed.name, new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce(listed.business, ''),
    new.email,
    listed.email is not null
  )
  on conflict (owner) do nothing;
  return new;
end $$;

create trigger exhibitor_on_signup after insert on auth.users for each row execute function on_signup();

-- Only an approved booth counts: everything that reads or writes by my_exhibitor() waits for approval.
create or replace function my_exhibitor() returns uuid language sql stable security definer set search_path = public as $$
  select id from exhibitors where owner = auth.uid() and approved
$$;
