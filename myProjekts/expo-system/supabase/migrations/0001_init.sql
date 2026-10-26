-- The expo system's data. Each exhibitor sees only his own rows (row level security).
-- The community list stays on the server: the booth searches it through a function that returns names only.

create extension if not exists pg_trgm with schema extensions;

-- ---------- exhibitors and their setup

create table exhibitors (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null unique references auth.users (id) on delete cascade,
  name text not null,
  business text not null default '',
  phone text,
  email text,
  -- how his messages address people: 'shalom' = "שלום [שם]", 'kavod' = בס"ד and "לכבוד ר' [שם]"
  greeting text not null default 'shalom' check (greeting in ('shalom', 'kavod')),
  sensitive boolean not null default false,
  created_at timestamptz not null default now()
);

-- Every save of the setup is a new version; the booth and the engine use the active one.
create table setups (
  id uuid primary key default gen_random_uuid(),
  exhibitor_id uuid not null references exhibitors (id) on delete cascade,
  version int not null,
  data jsonb not null,            -- the engine's Setup (engine/src/model.ts)
  source text not null default 'manual' check (source in ('manual', 'consultant')),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (exhibitor_id, version)
);
create unique index setups_one_active on setups (exhibitor_id) where active;

-- The message texts of each exhibitor, by id (the id a step's `message` points to).
create table message_templates (
  exhibitor_id uuid not null references exhibitors (id) on delete cascade,
  id text not null,
  body text not null,
  attachment_path text,           -- a price list, a portfolio: a file in storage
  primary key (exhibitor_id, id)
);

-- ---------- the community list (from the organisers; never in git)

create table people (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  city text,
  phone text,
  email text,
  business_owner boolean not null default false,
  business_name text,
  has_whatsapp boolean,           -- checked by the WhatsApp server, the way a person would
  created_at timestamptz not null default now()
);
create index people_name_trgm on people using gin (full_name extensions.gin_trgm_ops);

-- ---------- leads: a visitor at one exhibitor's booth

create table leads (
  id uuid primary key,            -- made on the phone, so a save that is sent twice stays one lead
  exhibitor_id uuid not null references exhibitors (id) on delete cascade,
  person_id uuid references people (id),
  -- a visitor who is not on the list: what was typed at the booth
  typed_name text,
  typed_phone text,
  taps text[] not null default '{}',
  customer_date date,
  note text,
  voice_path text,
  list_consent boolean not null default false,  -- sensitive businesses: the mailing list only with a yes
  opted_out boolean not null default false,
  captured_at timestamptz not null default now(),
  captured_on date not null default (now() at time zone 'Asia/Jerusalem')::date,
  check (person_id is not null or typed_name is not null)
);
create index leads_exhibitor on leads (exhibitor_id, captured_at desc);

-- What happened at each step (the engine's history).
create table lead_steps (
  id bigint generated always as identity primary key,
  lead_id uuid not null references leads (id) on delete cascade,
  step_id text not null,
  done_on date not null,
  outcome text not null check (outcome in ('engaged', 'noAnswer', 'closed', 'notRelevant', 'optOut')),
  created_at timestamptz not null default now(),
  unique (lead_id, step_id)
);

-- The next task of each lead, as the engine computed it last (one row per lead).
create table tasks (
  lead_id uuid primary key references leads (id) on delete cascade,
  exhibitor_id uuid not null references exhibitors (id) on delete cascade,
  kind text not null check (kind in ('task', 'askDate', 'end')),
  step_id text,
  action text,
  who text check (who in ('me', 'auto')),
  message text,
  due_on date,
  late boolean not null default false,
  end_reason text,
  computed_at timestamptz not null default now()
);
create index tasks_due on tasks (exhibitor_id, due_on) where kind <> 'end';

-- ---------- sending and replies

create table outbox (
  id uuid primary key default gen_random_uuid(),
  exhibitor_id uuid not null references exhibitors (id) on delete cascade,
  lead_id uuid references leads (id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'email')),
  template_id text,
  body text not null,
  not_before timestamptz not null default now(),   -- the sender spreads sends; nothing on Shabbat or Yom Tov
  sent_at timestamptz,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'cancelled')),
  error text,
  created_at timestamptz not null default now()
);
create index outbox_queue on outbox (not_before) where status = 'queued';

-- Replies read from WhatsApp (and later mail): only chats with his leads, only with his consent.
create table replies (
  id bigint generated always as identity primary key,
  exhibitor_id uuid not null references exhibitors (id) on delete cascade,
  lead_id uuid not null references leads (id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'email')),
  body text,
  received_at timestamptz not null default now()
);

create table whatsapp_connections (
  exhibitor_id uuid primary key references exhibitors (id) on delete cascade,
  status text not null default 'disconnected' check (status in ('disconnected', 'waiting_qr', 'connected', 'banned')),
  read_replies boolean not null default false,     -- his consent to read replies from his leads
  phone text,
  updated_at timestamptz not null default now()
);

-- "הסר": by phone or mail, for one exhibitor or (exhibitor_id null) for everyone.
create table opt_outs (
  id bigint generated always as identity primary key,
  exhibitor_id uuid references exhibitors (id) on delete cascade,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  check (phone is not null or email is not null)
);

-- ---------- row level security: each exhibitor sees his own

create function my_exhibitor() returns uuid language sql stable security definer set search_path = public as $$
  select id from exhibitors where owner = auth.uid()
$$;

alter table exhibitors enable row level security;
create policy own on exhibitors for all using (owner = auth.uid()) with check (owner = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['setups', 'message_templates', 'leads', 'tasks', 'outbox', 'replies', 'whatsapp_connections', 'opt_outs'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy own on %I for all using (exhibitor_id = my_exhibitor()) with check (exhibitor_id = my_exhibitor())', t);
  end loop;
end $$;

alter table lead_steps enable row level security;
create policy own on lead_steps for all
  using (exists (select 1 from leads l where l.id = lead_id and l.exhibitor_id = my_exhibitor()))
  with check (exists (select 1 from leads l where l.id = lead_id and l.exhibitor_id = my_exhibitor()));

-- people: no direct access from the app at all; the booth searches through this function.
alter table people enable row level security;

create function search_people(q text, max int default 12)
returns table (id uuid, full_name text, city text, business_owner boolean)
language sql stable security definer set search_path = public, extensions as $$
  select p.id, p.full_name, p.city, p.business_owner
  from people p
  where my_exhibitor() is not null and length(trim(q)) >= 2
    and (p.full_name % q or p.full_name ilike '%' || trim(q) || '%')
  order by similarity(p.full_name, q) desc
  limit least(max, 30)
$$;

-- The names alone (no phone, no mail), for the phone to keep a copy: the booth searches without a network.
create function people_directory()
returns table (id uuid, full_name text, city text, business_owner boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.city, p.business_owner from people p where my_exhibitor() is not null
$$;

-- Only signed-in exhibitors may call the functions; never an anonymous visitor of the site.
revoke execute on function my_exhibitor(), search_people(text, int), people_directory() from public, anon;
grant execute on function my_exhibitor(), search_people(text, int), people_directory() to authenticated;
