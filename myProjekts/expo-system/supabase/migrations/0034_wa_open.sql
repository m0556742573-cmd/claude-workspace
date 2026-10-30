-- WhatsApp for every exhibitor (30/10): until now the link was shown to the admin only, as a pilot. The admin opens it
-- for all when the server is ready, and sets how many accounts the server holds at most (each one is a live connection
-- in its memory); past that, a new link is refused with a word, never by the server falling over.
alter table system_state add column wa_open boolean not null default false, add column wa_max int not null default 60 check (wa_max between 1 and 500);
grant select (wa_open, wa_max) on system_state to anon, authenticated;

create function admin_set_wa(open boolean, max_accounts int default null) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  update system_state set wa_open = open, wa_max = coalesce(max_accounts, wa_max) where id = 1;
end $$;
revoke all on function admin_set_wa(boolean, int) from public, anon;
grant execute on function admin_set_wa(boolean, int) to authenticated;
