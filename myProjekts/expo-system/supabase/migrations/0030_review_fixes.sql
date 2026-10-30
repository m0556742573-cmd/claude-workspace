-- Fixes from the full review (30/10).

-- A new version of the setup in one step. Before, the app switched the old version off and then saved the new one; a
-- failure in between left the booth with no active setup, and the new-booth screen could not save version 1 either.
create function save_setup(data jsonb) returns int language plpgsql security definer set search_path = public as $$
declare ex uuid := my_exhibitor(); v int;
begin
  if ex is null then raise exception 'no exhibitor'; end if;
  select coalesce(max(s.version), 0) + 1 into v from setups s where s.exhibitor_id = ex;
  update setups set active = false where exhibitor_id = ex and active;
  insert into setups (exhibitor_id, version, data, source, active) values (ex, v, data, 'manual', true);
  return v;
end $$;
revoke all on function save_setup(jsonb) from public, anon;
grant execute on function save_setup(jsonb) to authenticated;

-- "עסק רגיש" is switched in the setup, but the server's functions read exhibitors.sensitive, which no screen wrote: his
-- WhatsApp signature, his self-registration page and its consent, the removal page. The active setup now sets it.
create function setup_sensitive_sync() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.active then
    update exhibitors set sensitive = coalesce((new.data ->> 'sensitive')::boolean, false) where id = new.exhibitor_id;
  end if;
  return new;
end $$;
create trigger setup_sensitive_sync after insert or update of active, data on setups
  for each row execute function setup_sensitive_sync();
update exhibitors e set sensitive = coalesce((select (s.data ->> 'sensitive')::boolean from setups s where s.exhibitor_id = e.id and s.active limit 1), e.sensitive);
