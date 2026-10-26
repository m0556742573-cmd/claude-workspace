-- The phone and mail of one visitor, only for the exhibitor he registered with: "הבא בתור" needs a number to call.
-- The community list itself stays closed; this opens one row at a time, and only through a lead of his own.
create function lead_contact(lead uuid)
returns table (phone text, email text, has_whatsapp boolean)
language sql stable security definer set search_path = public as $$
  select coalesce(p.phone, l.typed_phone), p.email, p.has_whatsapp
  from leads l left join people p on p.id = l.person_id
  where l.id = lead and l.exhibitor_id = my_exhibitor()
$$;

revoke execute on function lead_contact(uuid) from public, anon;
grant execute on function lead_contact(uuid) to authenticated;

-- Recordings: sending one again replaces it (upsert), and cancelling a registration removes its recordings.
create policy voice_own_update on storage.objects for update to authenticated
  using (bucket_id = 'voice' and (storage.foldername(name))[1] = my_exhibitor()::text)
  with check (bucket_id = 'voice' and (storage.foldername(name))[1] = my_exhibitor()::text);
create policy voice_own_delete on storage.objects for delete to authenticated
  using (bucket_id = 'voice' and (storage.foldername(name))[1] = my_exhibitor()::text);
