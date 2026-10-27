-- The phone and mail of all his own leads at once, for the export to Excel ("ייצוא לאקסל" in the leads screen).
-- Same rule as lead_contact: only through a lead of his own; the community list itself stays closed.
create function my_lead_contacts()
returns table (lead_id uuid, phone text, email text)
language sql stable security definer set search_path = public as $$
  select l.id, coalesce(p.phone, l.typed_phone), p.email
  from leads l left join people p on p.id = l.person_id
  where l.exhibitor_id = my_exhibitor()
$$;

revoke execute on function my_lead_contacts() from public, anon;
grant execute on function my_lead_contacts() to authenticated;
