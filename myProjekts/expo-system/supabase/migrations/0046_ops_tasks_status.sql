-- 0046: the expo admin keeps everything Yitzhak manages and follows, and the state of every platform, all the time
-- (יצחק, 3/11: "שכל החלטות והדברים הפתוחים וכל מה שאני אמור לנהל ולעקוב חייב להיות מתוך הניהול של האקספו כמו מערכת
-- ניהול משימות אחרת דברים יאבדו", and "אני רוצה סטטוס מצב בניהול האקספו כל הזמן").
-- A schema of its own, `ops`, which the API does not expose. The admin reads and writes it only through the public.ops_*
-- functions below, each checking is_admin(). The watcher (a Cloudflare Worker) and the server report their checks with
-- a key of their own, kept here only as its sha256. Claude's sessions write with SQL, setting ops.by to say who wrote.
-- Nothing here touches the exhibitors' data; the checks only count it.

create schema if not exists ops;
revoke all on schema ops from public, anon, authenticated;

-- ---------- tasks and decisions (what the live board held until 3/11)

create table ops.items (
  id text primary key default 'i-' || substr(md5(gen_random_uuid()::text), 1, 10),
  kind text not null default 'task' check (kind in ('task', 'decision', 'bug', 'finding')),
  track text not null default 'build',
  title text not null check (length(btrim(title)) > 0),
  detail text,
  owner text not null default 'yitzhak' check (owner in ('yitzhak', 'claude')),
  status text not null default 'open' check (status in ('open', 'doing', 'blocked', 'done', 'dropped')),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  due date,
  sort int,
  note text,        -- his answer
  reply text,       -- Claude's answer to it
  check_how text,   -- how we know it is done
  source text,      -- where it came from: a board id, a review, a session
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  done_at timestamptz
);
create index items_open on ops.items (owner, status, due);

-- Every change is kept, field by field, so nothing he wrote or decided is lost.
create table ops.item_log (
  id bigint generated always as identity primary key,
  item_id text not null references ops.items (id) on delete cascade,
  at timestamptz not null default now(),
  by text,
  field text not null,
  old text,
  new text
);
create index item_log_item on ops.item_log (item_id, at);

create function ops.who() returns text language sql stable as $$
  select coalesce(nullif(current_setting('ops.by', true), ''), auth.jwt() ->> 'email', current_user::text)
$$;

create function ops.item_stamped() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  if new.status = 'done' and (tg_op = 'INSERT' or old.status is distinct from 'done') then new.done_at := now(); end if;
  if new.status <> 'done' then new.done_at := null; end if;
  return new;
end $$;
create trigger item_stamped before insert or update on ops.items for each row execute function ops.item_stamped();

create function ops.item_logged() returns trigger language plpgsql security definer set search_path = ops, public as $$
declare f text; o text; n text;
begin
  if tg_op = 'INSERT' then
    insert into ops.item_log (item_id, by, field, new) values (new.id, ops.who(), 'created', new.title);
    return null;
  end if;
  foreach f in array array['title', 'detail', 'kind', 'track', 'owner', 'status', 'priority', 'due', 'note', 'reply', 'check_how'] loop
    execute format('select ($1).%I::text, ($2).%I::text', f, f) into o, n using old, new;
    if o is distinct from n then insert into ops.item_log (item_id, by, field, old, new) values (new.id, ops.who(), f, o, n); end if;
  end loop;
  return null;
end $$;
create trigger item_logged after insert or update on ops.items for each row execute function ops.item_logged();

-- ---------- the state of every platform

-- One row per thing we watch. `source` says who writes it: the watcher every 5 minutes, the server every 5 minutes,
-- the database itself on every read, or by hand (a session, after checking a dashboard). A reported check that stops
-- reporting reads as unknown after stale_after.
create table ops.checks (
  key text primary key,
  platform text not null,
  label text not null,
  level text not null default 'unknown' check (level in ('ok', 'warn', 'bad', 'unknown')),
  value text,
  detail text,
  expires_on date,
  source text not null default 'manual' check (source in ('watch', 'server', 'db', 'manual')),
  stale_after interval,
  sort int,
  checked_at timestamptz,
  since timestamptz not null default now()
);

-- Only changes of level are kept, so the log reads as "fell at, came back at".
create table ops.check_log (
  id bigint generated always as identity primary key,
  key text not null,
  at timestamptz not null default now(),
  level text not null,
  value text,
  detail text
);
create index check_log_key on ops.check_log (key, at);

create table ops.settings (key text primary key, value text not null);

-- The watcher's and the server's keys: only their sha256 is kept (rows 'reporter:watch', 'reporter:server').
create function ops.reporter_ok(p_key text) returns boolean language sql stable security definer set search_path = ops as $$
  select exists (select 1 from ops.settings where key like 'reporter:%'
                 and value = encode(sha256(convert_to(coalesce(p_key, ''), 'UTF8')), 'hex'))
$$;

create function ops.put_check(c jsonb, p_source text) returns jsonb language plpgsql security definer set search_path = ops, public as $$
declare k text := c ->> 'key'; lv text := coalesce(c ->> 'level', 'unknown'); was ops.checks;
begin
  if k is null or lv not in ('ok', 'warn', 'bad', 'unknown') then return null; end if;
  select * into was from ops.checks where key = k;
  insert into ops.checks (key, platform, label, level, value, detail, expires_on, source, stale_after, checked_at, since)
  values (k, coalesce(c ->> 'platform', split_part(k, '.', 1)), coalesce(c ->> 'label', k), lv, c ->> 'value', c ->> 'detail',
          (c ->> 'expires_on')::date, p_source,
          case when p_source in ('watch', 'server') then interval '15 minutes' end, now(), now())
  on conflict (key) do update set
    platform = excluded.platform, label = excluded.label, level = excluded.level, value = excluded.value,
    detail = excluded.detail, expires_on = coalesce(excluded.expires_on, checks.expires_on), source = excluded.source,
    stale_after = excluded.stale_after, checked_at = now(),
    since = case when checks.level is distinct from excluded.level then now() else checks.since end;
  if was.key is null or was.level is distinct from lv then
    insert into ops.check_log (key, level, value, detail) values (k, lv, c ->> 'value', c ->> 'detail');
    return jsonb_build_object('key', k, 'label', coalesce(c ->> 'label', k), 'from', coalesce(was.level, 'new'), 'to', lv,
                              'value', c ->> 'value');
  end if;
  return null;
end $$;

-- What the database can say about itself, refreshed on every read of the status page.
create function ops.refresh_db_checks() returns void language plpgsql security definer set search_path = ops, public as $$
declare db bigint := pg_database_size(current_database());
        st bigint := (select coalesce(sum((metadata ->> 'size')::bigint), 0) from storage.objects);
        real_ex int := (select count(*) from exhibitors e where e.approved
                          and not exists (select 1 from admins a where lower(a.email) = lower(e.email)));
        stuck int := (select count(*) from outbox where status = 'queued'
                        and coalesce(not_before, created_at) < now() - interval '30 minutes');
        blocked int := (select count(*) from exhibitors where wa_blocked_at is not null);
        -- Outside the sending hours (wa-server/limits.ts: 9–20, Friday until 13, not on Shabbat) waiting is normal.
        il timestamp := now() at time zone 'Asia/Jerusalem';
        sending boolean := extract(isodow from il) <> 6
                           and extract(hour from il) >= 9
                           and extract(hour from il) < case when extract(isodow from il) = 5 then 13 else 20 end;
begin
  perform ops.put_check(jsonb_build_object('key', 'supabase.db', 'platform', 'supabase', 'label', 'גודל המסד',
    'value', pg_size_pretty(db) || ' מתוך 500MB',
    'level', case when db > 450 * 1024 * 1024 then 'bad' when db > 350 * 1024 * 1024 then 'warn' else 'ok' end), 'db');
  perform ops.put_check(jsonb_build_object('key', 'supabase.storage', 'platform', 'supabase', 'label', 'קבצים והקלטות',
    'value', pg_size_pretty(st) || ' מתוך 1GB',
    'level', case when st > 900 * 1024 * 1024 then 'bad' when st > 700 * 1024 * 1024 then 'warn' else 'ok' end), 'db');
  perform ops.put_check(jsonb_build_object('key', 'expo.real_exhibitors', 'platform', 'expo', 'label', 'מציגים שאושרו, בלי מנהלים',
    'value', real_ex::text, 'level', 'ok',
    'detail', 'כשנרשם המציג האמיתי הראשון עוברים ל-Supabase בתשלום (יצחק, 1/11)'), 'db');
  perform ops.put_check(jsonb_build_object('key', 'expo.outbox_stuck', 'platform', 'expo', 'label', 'הודעות תקועות בתור',
    'value', stuck::text,
    'level', case when not sending or stuck = 0 then 'ok' when stuck > 20 then 'bad' else 'warn' end,
    'detail', case when sending then 'הודעות שהיו צריכות לצאת לפני יותר מחצי שעה'
                   else 'עכשיו מחוץ לשעות השליחה, אז הודעות מחכות כרגיל' end), 'db');
  perform ops.put_check(jsonb_build_object('key', 'wa.blocked', 'platform', 'wa', 'label', 'מספרי וואטסאפ שנחסמו',
    'value', blocked::text, 'level', case when blocked > 0 then 'warn' else 'ok' end), 'db');
end $$;

-- ---------- what the admin calls

create function public.ops_items() returns jsonb language plpgsql stable security definer set search_path = ops, public as $$
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  return coalesce((select jsonb_agg(to_jsonb(i) order by i.due nulls last, i.sort nulls last, i.created_at) from ops.items i), '[]'::jsonb);
end $$;

create function public.ops_item_log(p_id text) returns jsonb language plpgsql stable security definer set search_path = ops, public as $$
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  return coalesce((select jsonb_agg(to_jsonb(l) order by l.at desc) from ops.item_log l where l.item_id = p_id), '[]'::jsonb);
end $$;

-- He adds an item, answers one, or moves it along. Only these fields come from the screen; a missing field stays.
create function public.ops_save_item(p jsonb) returns jsonb language plpgsql security definer set search_path = ops, public as $$
declare r ops.items;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  if p ? 'id' and exists (select 1 from ops.items where id = p ->> 'id') then
    update ops.items set
      title = case when p ? 'title' then p ->> 'title' else title end,
      detail = case when p ? 'detail' then p ->> 'detail' else detail end,
      kind = case when p ? 'kind' then p ->> 'kind' else kind end,
      track = case when p ? 'track' then p ->> 'track' else track end,
      owner = case when p ? 'owner' then p ->> 'owner' else owner end,
      status = case when p ? 'status' then p ->> 'status' else status end,
      priority = case when p ? 'priority' then p ->> 'priority' else priority end,
      due = case when p ? 'due' then nullif(p ->> 'due', '')::date else due end,
      note = case when p ? 'note' then p ->> 'note' else note end,
      check_how = case when p ? 'check_how' then p ->> 'check_how' else check_how end
    where id = p ->> 'id' returning * into r;
  else
    insert into ops.items (kind, track, title, detail, owner, priority, due, note, source, created_by)
    values (coalesce(p ->> 'kind', 'task'), coalesce(p ->> 'track', 'build'), p ->> 'title', p ->> 'detail',
            coalesce(p ->> 'owner', 'yitzhak'), coalesce(p ->> 'priority', 'medium'), nullif(p ->> 'due', '')::date,
            p ->> 'note', 'admin', auth.jwt() ->> 'email')
    returning * into r;
  end if;
  return to_jsonb(r);
end $$;

-- The status page: the database's own checks are refreshed first; a reported check gone silent reads as unknown.
create function public.ops_checks() returns jsonb language plpgsql security definer set search_path = ops, public as $$
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  perform ops.refresh_db_checks();
  return jsonb_build_object(
    'now', now(),
    'checks', coalesce((select jsonb_agg(to_jsonb(c) || case when c.stale_after is not null and c.checked_at < now() - c.stale_after
                          then jsonb_build_object('level', 'unknown', 'stale', true) else '{}'::jsonb end
                        order by c.platform, c.sort nulls last, c.key) from ops.checks c), '[]'::jsonb),
    'log', coalesce((select jsonb_agg(to_jsonb(l) order by l.at desc)
                     from (select * from ops.check_log order by at desc limit 50) l), '[]'::jsonb));
end $$;

-- The watcher and the server report here. The answer lists the checks whose level changed, so the watcher knows when
-- to send mail ("fell", "came back") and does not send it every 5 minutes.
create function public.ops_report(p_key text, p_checks jsonb) returns jsonb language plpgsql security definer set search_path = ops, public as $$
declare c jsonb; ch jsonb; changed jsonb := '[]'::jsonb; src text;
begin
  if not ops.reporter_ok(p_key) then raise exception 'not allowed'; end if;
  src := (select replace(key, 'reporter:', '') from ops.settings
          where key like 'reporter:%' and value = encode(sha256(convert_to(p_key, 'UTF8')), 'hex') limit 1);
  for c in select e from jsonb_array_elements(coalesce(p_checks, '[]'::jsonb)) as e loop
    ch := ops.put_check(c, case when src = 'server' then 'server' else 'watch' end);
    if ch is not null then changed := changed || jsonb_build_array(ch); end if;
  end loop;
  return jsonb_build_object('changed', changed);
end $$;

revoke all on all functions in schema ops from public, anon, authenticated;
revoke all on function public.ops_items(), public.ops_item_log(text), public.ops_save_item(jsonb), public.ops_checks(),
  public.ops_report(text, jsonb) from public, anon;
grant execute on function public.ops_items(), public.ops_item_log(text), public.ops_save_item(jsonb), public.ops_checks()
  to authenticated;
grant execute on function public.ops_report(text, jsonb) to anon, authenticated;
