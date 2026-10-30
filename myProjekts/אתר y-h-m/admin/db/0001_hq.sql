-- YHM control center, phase 1: the site's visits and clicks, campaign links, who may enter.
-- The tables live in their own schema (hq), which the API does not expose; everything goes through
-- public.hq_* functions: the site's Worker may only add an event (hq_hit), everything else is for an admin.
-- Where: inside the Supabase project of דוכן חכם (expo-system), by his choice of 29/10 (free, Google sign-in already set up there).
-- Nothing here reads or changes the expo's own tables.

create schema if not exists hq;
revoke all on schema hq from public, anon, authenticated;

-- who may enter: Google accounts by email
create table hq.admins (
  email      text primary key check (email = lower(email)),
  note       text,
  created_at timestamptz not null default now()
);

create table hq.campaigns (
  code       text primary key check (code ~ '^[a-z0-9-]{2,24}$'),
  name       text not null check (length(name) between 1 and 80),
  note       text check (length(note) <= 500),
  created_at timestamptz not null default now()
);

-- one row per visit or click; nothing that identifies a person (visitor is a code that changes daily)
create table hq.site_events (
  id       bigint generated always as identity primary key,
  at       timestamptz not null default now(),
  type     text not null check (type in ('visit', 'whatsapp', 'phone', 'mail')),
  page     text check (length(page) <= 200),
  referrer text check (length(referrer) <= 120),
  campaign text references hq.campaigns (code) on update cascade on delete set null,
  device   text check (device in ('mobile', 'desktop', 'tablet')),
  city     text check (length(city) <= 80),
  country  text check (country ~ '^[A-Z]{2}$'),
  visitor  text check (visitor ~ '^[0-9a-f]{16,64}$')
);
create index site_events_at on hq.site_events (at desc);
create index site_events_campaign on hq.site_events (campaign, at) where campaign is not null;

alter table hq.admins enable row level security;
alter table hq.campaigns enable row level security;
alter table hq.site_events enable row level security;

-- An admin is a signed-in user whose Google identity carries an email on the list.
-- It checks the Google identity itself, not only the account's email, so an email/password sign-up
-- with the same address does not get in.
create or replace function public.hq_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from auth.identities i
    join hq.admins a on a.email = lower(i.identity_data ->> 'email')
    where i.user_id = auth.uid() and i.provider = 'google'
  );
$$;

create or replace function hq.require_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.hq_is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
end $$;

-- the site's Worker reports a visit or a click; anything that does not fit is dropped quietly
create or replace function public.hq_hit(
  p_type text, p_page text, p_referrer text, p_campaign text,
  p_device text, p_city text, p_country text, p_visitor text
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_type is null or p_type not in ('visit', 'whatsapp', 'phone', 'mail') then return; end if;
  -- the key that calls this is public, so a flood is cut off: far more than a small site gets in a minute
  if (select count(*) from hq.site_events where at > now() - interval '1 minute') >= 120 then return; end if;
  insert into hq.site_events (type, page, referrer, campaign, device, city, country, visitor)
  values (
    p_type,
    left(p_page, 200),
    left(lower(p_referrer), 120),
    (select c.code from hq.campaigns c where c.code = p_campaign),
    case when p_device in ('mobile', 'desktop', 'tablet') then p_device end,
    left(p_city, 80),
    case when p_country ~ '^[A-Z]{2}$' then p_country end,
    case when p_visitor ~ '^[0-9a-f]{16,64}$' then p_visitor end
  );
end $$;

-- everything the overview and the site screens show, for a period and the one before it
create or replace function public.hq_stats(p_from timestamptz, p_to timestamptz, p_bucket text default 'day')
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  span interval := p_to - p_from;
  b text := case when p_bucket = 'hour' then 'hour' else 'day' end;
  step interval := case when p_bucket = 'hour' then interval '1 hour' else interval '1 day' end;
  r jsonb;
begin
  perform hq.require_admin();
  with cur as (select * from hq.site_events where at >= p_from and at < p_to),
       prev as (select * from hq.site_events where at >= p_from - span and at < p_from),
       slots as (
         -- buckets on Israel's calendar, so a day is a day across the clock change
         select g as local_t
         from generate_series(date_trunc(b, p_from at time zone 'Asia/Jerusalem'),
                              date_trunc(b, p_to at time zone 'Asia/Jerusalem'), step) g
       )
  select jsonb_build_object(
    'visits',         (select count(*) from cur where type = 'visit'),
    'visitors',       (select count(distinct visitor) from cur where type = 'visit'),
    'inquiries',      (select count(*) from cur where type <> 'visit'),
    'askers',         (select count(distinct visitor) from cur where type <> 'visit'),
    'prev_visits',    (select count(*) from prev where type = 'visit'),
    'prev_visitors',  (select count(distinct visitor) from prev where type = 'visit'),
    'prev_inquiries', (select count(*) from prev where type <> 'visit'),
    'series', (
      select coalesce(jsonb_agg(jsonb_build_object(
               't', s.local_t at time zone 'Asia/Jerusalem',
               'visits', (select count(*) from cur e where e.type = 'visit' and date_trunc(b, e.at at time zone 'Asia/Jerusalem') = s.local_t),
               'inquiries', (select count(*) from cur e where e.type <> 'visit' and date_trunc(b, e.at at time zone 'Asia/Jerusalem') = s.local_t)
             ) order by s.local_t), '[]'::jsonb)
      from slots s),
    'sources', (
      select coalesce(jsonb_agg(jsonb_build_object('k', x.referrer, 'c', x.name, 'visits', x.n) order by x.n desc), '[]'::jsonb)
      from (select e.referrer, c.name, count(*) n from cur e left join hq.campaigns c on c.code = e.campaign
            where e.type = 'visit' group by 1, 2 order by n desc limit 30) x),
    'buttons', (
      select coalesce(jsonb_agg(jsonb_build_object('k', x.type, 'n', x.n) order by x.n desc), '[]'::jsonb)
      from (select type, count(*) n from cur where type <> 'visit' group by 1) x),
    'devices', (
      select coalesce(jsonb_agg(jsonb_build_object('k', x.device, 'n', x.n) order by x.n desc), '[]'::jsonb)
      from (select device, count(*) n from cur where type = 'visit' group by 1) x),
    'cities', (
      select coalesce(jsonb_agg(jsonb_build_object('k', x.city, 'n', x.n) order by x.n desc), '[]'::jsonb)
      from (select city, count(*) n from cur where type = 'visit' group by 1 order by n desc limit 8) x),
    'pages', (
      select coalesce(jsonb_agg(jsonb_build_object('k', x.page, 'n', x.n) order by x.n desc), '[]'::jsonb)
      from (select page, count(*) n from cur where type = 'visit' group by 1 order by n desc limit 8) x)
  ) into r;
  return r;
end $$;

create or replace function public.hq_recent(p_limit int default 12)
returns table (at timestamptz, type text, city text, device text, referrer text, campaign text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform hq.require_admin();
  return query
    select e.at, e.type, e.city, e.device, e.referrer, c.name
    from hq.site_events e left join hq.campaigns c on c.code = e.campaign
    order by e.at desc limit least(greatest(p_limit, 1), 100);
end $$;

create or replace function public.hq_campaigns()
returns table (code text, name text, note text, created_at timestamptz, visits bigint, inquiries bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform hq.require_admin();
  return query
    select c.code, c.name, c.note, c.created_at,
           count(e.id) filter (where e.type = 'visit'),
           count(e.id) filter (where e.type <> 'visit')
    from hq.campaigns c left join hq.site_events e on e.campaign = c.code
    group by c.code order by c.created_at desc;
end $$;

create or replace function public.hq_add_campaign(p_name text, p_code text, p_note text default null)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform hq.require_admin();
  insert into hq.campaigns (code, name, note) values (lower(trim(p_code)), trim(p_name), nullif(trim(p_note), ''));
end $$;

create or replace function public.hq_admins()
returns table (email text, note text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform hq.require_admin();
  return query select a.email, a.note from hq.admins a order by a.created_at;
end $$;

-- who may call what
revoke all on function public.hq_is_admin(), hq.require_admin(),
  public.hq_hit(text, text, text, text, text, text, text, text),
  public.hq_stats(timestamptz, timestamptz, text), public.hq_recent(int), public.hq_campaigns(),
  public.hq_add_campaign(text, text, text), public.hq_admins()
  from public, anon, authenticated;
grant execute on function public.hq_hit(text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.hq_is_admin(), public.hq_stats(timestamptz, timestamptz, text), public.hq_recent(int),
  public.hq_campaigns(), public.hq_add_campaign(text, text, text), public.hq_admins() to authenticated;

-- The owner's email is added once by hand, not from this file (no personal details in git):
--   insert into hq.admins (email, note) values ('<his Google email>', 'בעלים');
