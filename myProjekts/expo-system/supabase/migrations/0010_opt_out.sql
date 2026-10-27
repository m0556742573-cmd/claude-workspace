-- "ביקש להסיר": his phone and mail go on the exhibitor's do-not-send list, so no message goes to him again from this
-- exhibitor, also under another registration. Undo takes them off. The app never sees the list itself.
create function opt_out_lead(lead uuid, asked boolean) returns void language plpgsql security definer set search_path = public as $$
declare c record;
begin
  select coalesce(p.phone, l.typed_phone) as phone, p.email into c
  from leads l left join people p on p.id = l.person_id
  where l.id = lead and l.exhibitor_id = my_exhibitor();
  if not found then raise exception 'not allowed'; end if;
  if asked then
    if c.phone is not null or c.email is not null then
      insert into opt_outs (exhibitor_id, phone, email) values (my_exhibitor(), c.phone, c.email);
    end if;
  else
    delete from opt_outs o where o.exhibitor_id = my_exhibitor()
      and (o.phone is not distinct from c.phone) and (o.email is not distinct from c.email);
  end if;
end $$;

-- lead_contact now also says whether he asked not to get messages (from this exhibitor, or from everyone).
drop function lead_contact(uuid);
create function lead_contact(lead uuid)
returns table (phone text, email text, has_whatsapp boolean, opted_out boolean)
language sql stable security definer set search_path = public as $$
  select coalesce(p.phone, l.typed_phone), p.email, p.has_whatsapp,
    exists (
      select 1 from opt_outs o
      where (o.exhibitor_id = l.exhibitor_id or o.exhibitor_id is null)
        and ((o.phone is not null and o.phone = coalesce(p.phone, l.typed_phone)) or (o.email is not null and o.email = p.email))
    )
  from leads l left join people p on p.id = l.person_id
  where l.id = lead and l.exhibitor_id = my_exhibitor()
$$;

revoke execute on function lead_contact(uuid), opt_out_lead(uuid, boolean) from public, anon;
grant execute on function lead_contact(uuid), opt_out_lead(uuid, boolean) to authenticated;
