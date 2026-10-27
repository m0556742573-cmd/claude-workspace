-- The registration's WhatsApp question (his notes, 20/10): no WhatsApp, or the number it runs on, personal or business.
-- No WhatsApp hides it everywhere: the messages go by mail only. `onboarded` = the welcome was filled once.
alter table exhibitors add column whatsapp text;
alter table exhibitors add column whatsapp_kind text check (whatsapp_kind in ('personal', 'business'));
alter table exhibitors add column onboarded boolean not null default false;
