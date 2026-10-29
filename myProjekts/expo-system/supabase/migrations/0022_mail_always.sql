-- 0022: when the visitor's own mail receives is the exhibitor's choice (יצחק, 29/10: "לדעתי זה בחירה של מציג"; 18/10:
-- a message goes to the channels the exhibitor chose). Only when his phone gets no WhatsApp (§10, the default), or
-- always. Each lead can still be switched in its page.

alter table exhibitors add column mail_always boolean not null default false;

create or replace function lead_destinations(lead uuid)
returns table (id uuid, kind text, value text, label text, own boolean, receives boolean, wa boolean, removed boolean)
language sql stable security definer set search_path = public as $$
  with me as (
    select l.id, l.exhibitor_id, l.opted_out, l.own_phone_on, l.own_email_on, o.phone, o.email, o.wa, e.mail_always
    from leads l cross join lateral lead_own(l.id) o join exhibitors e on e.id = l.exhibitor_id
    where l.id = lead and l.exhibitor_id = my_exhibitor()
  ),
  gone as (select x.phone, lower(x.email) email from opt_outs x join me on x.exhibitor_id = me.exhibitor_id or x.exhibitor_id is null)
  select null::uuid, 'phone', me.phone, null::text, true, coalesce(me.own_phone_on, true), me.wa,
    me.opted_out or exists (select 1 from gone where phone_key(gone.phone) = me.phone)
  from me where me.phone is not null
  union all
  select null::uuid, 'email', me.email, null::text, true,
    coalesce(me.own_email_on, me.mail_always or not (coalesce(me.own_phone_on, true) and me.phone is not null and coalesce(me.wa, false))), null::boolean,
    me.opted_out or exists (select 1 from gone where gone.email = me.email)
  from me where me.email is not null
  union all
  select c.id, c.kind, c.value, c.label, false, c.receives, c.has_whatsapp,
    me.opted_out or exists (select 1 from gone where (c.kind = 'phone' and phone_key(gone.phone) = c.value) or (c.kind = 'email' and gone.email = c.value))
  from me join lead_contacts c on c.lead_id = me.id
$$;
