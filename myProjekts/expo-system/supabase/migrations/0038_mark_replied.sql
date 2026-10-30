-- "ענה לי" by hand (model §9, יצחק 22/10): he got back to the exhibitor outside what the system reads (a call, a mail, a
-- WhatsApp with reading switched off). It counts as a reply: the path stops, the visitor rises in "היום", and the
-- reply shows in the lead's timeline. A note from him, if he wrote one, is the reply's text.
create function mark_replied(lead uuid, note text default null) returns void language plpgsql security definer set search_path = public as $$
declare ex uuid := my_exhibitor();
begin
  if not exists (select 1 from leads l where l.id = lead and l.exhibitor_id = ex) then raise exception 'not allowed'; end if;
  insert into lead_replies (exhibitor_id, lead_id, body, optout)
  values (ex, lead, coalesce(nullif(btrim(note), ''), 'סומן ביד: הוא ענה'), false);
  update outbox set status = 'cancelled', error = 'replied' where lead_id = lead and step_id is not null and status = 'queued';
end $$;
revoke all on function mark_replied(uuid, text) from public, anon;
grant execute on function mark_replied(uuid, text) to authenticated;
