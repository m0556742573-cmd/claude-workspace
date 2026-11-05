-- 0049: mail for what the server and the database report, not only for what the watcher sees itself (5/11).
-- Until now the watcher (watch/, every 5 minutes) mailed only its own four checks. A failed backup, a full disk, a
-- WhatsApp number blocked or messages stuck in the queue showed on the status page and nowhere else, and the database's
-- own checks were refreshed only when someone opened that page. Now each watcher run, inside ops_report:
--   1. refreshes the database's checks;
--   2. sets "השרת מדווח" bad when the server has not reported for 15 minutes (a server that is down cannot say so);
--   3. returns, with its own changes, every server or database check whose level has held for 4 minutes and differs
--      from the level last mailed. The watcher mails them as it mails its own (no change in watch/).
-- What was last mailed sits in ops.settings as mailed:<key>, starting from the levels as they are now, so the first run
-- mails nothing old. Holding 4 minutes and comparing with the last mail keeps a value that jumps back and forth quiet.
-- And b-paid-alert: the first approved exhibitor who is not an admin is a warning until Supabase is paid (the setting
-- supabase:pro), per his 1/11 decision ("כשנרשם המציג האמיתי הראשון עוברים ל-Supabase בתשלום"). It mails once.
-- No table changes: two functions and rows in ops.settings.

create or replace function ops.refresh_db_checks() returns void language plpgsql security definer set search_path = ops, public as $$
declare db bigint := pg_database_size(current_database());
        st bigint := (select coalesce(sum((metadata ->> 'size')::bigint), 0) from storage.objects);
        real_ex int := (select count(*) from exhibitors e where e.approved
                          and not exists (select 1 from admins a where lower(a.email) = lower(e.email)));
        pro boolean := exists (select 1 from ops.settings where key = 'supabase:pro');
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
    'value', real_ex::text || case when real_ex > 0 and not pro then ' · אם זה מציג אמיתי, הגיע הזמן ל-Supabase Pro' else '' end,
    'level', case when real_ex > 0 and not pro then 'warn' else 'ok' end,
    'detail', 'כשנרשם המציג האמיתי הראשון עוברים ל-Supabase בתשלום (יצחק, 1/11)'), 'db');
  perform ops.put_check(jsonb_build_object('key', 'expo.outbox_stuck', 'platform', 'expo', 'label', 'הודעות תקועות בתור',
    'value', stuck::text,
    'level', case when not sending or stuck = 0 then 'ok' when stuck > 20 then 'bad' else 'warn' end,
    'detail', case when sending then 'הודעות שהיו צריכות לצאת לפני יותר מחצי שעה'
                   else 'עכשיו מחוץ לשעות השליחה, אז הודעות מחכות כרגיל' end), 'db');
  perform ops.put_check(jsonb_build_object('key', 'wa.blocked', 'platform', 'wa', 'label', 'מספרי וואטסאפ שנחסמו',
    'value', blocked::text, 'level', case when blocked > 0 then 'warn' else 'ok' end), 'db');
end $$;

create or replace function public.ops_report(p_key text, p_checks jsonb) returns jsonb language plpgsql security definer set search_path = ops, public as $$
declare c jsonb; ch jsonb; changed jsonb := '[]'::jsonb; src text; last_server timestamptz; r record;
begin
  if not ops.reporter_ok(p_key) then raise exception 'not allowed'; end if;
  src := (select replace(key, 'reporter:', '') from ops.settings
          where key like 'reporter:%' and value = encode(sha256(convert_to(p_key, 'UTF8')), 'hex') limit 1);
  for c in select e from jsonb_array_elements(coalesce(p_checks, '[]'::jsonb)) as e loop
    ch := ops.put_check(c, case when src = 'server' then 'server' else 'watch' end);
    if ch is not null then changed := changed || jsonb_build_array(ch); end if;
  end loop;
  if src = 'server' then return jsonb_build_object('changed', changed); end if;

  -- The watcher's run: also what the server and the database report.
  perform ops.refresh_db_checks();
  select max(checked_at) into last_server from ops.checks where source = 'server';
  ch := ops.put_check(jsonb_build_object('key', 'vps.reporting', 'platform', 'vps', 'label', 'השרת מדווח',
    'level', case when last_server is null or last_server < now() - interval '15 minutes' then 'bad' else 'ok' end,
    'value', case when last_server is null then 'אין דיווח'
                  else 'דיווח אחרון ' || to_char(last_server at time zone 'Asia/Jerusalem', 'DD/MM HH24:MI') end,
    'detail', 'השרת שולח את המצב שלו כל 5 דקות. אם הוא לא שולח רבע שעה, הוא כנראה למטה או בלי רשת.'), 'watch');
  if ch is not null then changed := changed || jsonb_build_array(ch); end if;

  for r in select k.key, k.label, k.level, k.value, coalesce(s.value, 'ok') as mailed
             from ops.checks k left join ops.settings s on s.key = 'mailed:' || k.key
            where k.source in ('server', 'db') and k.level <> 'unknown'
              and k.level is distinct from coalesce(s.value, 'ok')
              and k.since <= now() - interval '4 minutes'
  loop
    changed := changed || jsonb_build_array(jsonb_build_object(
      'key', r.key, 'label', r.label, 'from', r.mailed, 'to', r.level, 'value', r.value));
    insert into ops.settings (key, value) values ('mailed:' || r.key, r.level)
      on conflict (key) do update set value = excluded.value;
  end loop;
  return jsonb_build_object('changed', changed);
end $$;

-- Starting point: what is there now counts as already mailed. expo.real_exhibitors starts at its level before this
-- migration (ok), so its first warning does go out, once.
insert into ops.settings (key, value)
select 'mailed:' || key, level from ops.checks where source in ('server', 'db') and level <> 'unknown'
on conflict (key) do nothing;
