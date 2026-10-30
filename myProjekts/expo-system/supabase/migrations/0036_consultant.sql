-- The setup consultant (יצחק, 22/10 and 30/10): his conversation is kept, so it stays available after the setup; the
-- structure it filled and the setup it built are kept beside it. The server writes (with its own key, after checking his
-- sign-in); he reads his own. Every turn counts what it cost, against a daily limit per booth.
create table consult_sessions (
  id uuid primary key default gen_random_uuid(),
  exhibitor_id uuid not null references exhibitors (id) on delete cascade,
  turns jsonb not null default '[]',
  draft jsonb not null default '{}',
  built jsonb,
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index consult_sessions_exhibitor on consult_sessions (exhibitor_id, updated_at desc);
alter table consult_sessions enable row level security;
create policy own_read on consult_sessions for select using (exhibitor_id = my_exhibitor());

-- His latest conversation (the server's view).
create function consult_get(key text, exhibitor uuid, session uuid default null)
returns consult_sessions language plpgsql stable security definer set search_path = public as $$
declare r consult_sessions;
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  select * into r from consult_sessions c where c.exhibitor_id = exhibitor and (session is null or c.id = session)
  order by c.updated_at desc limit 1;
  return r;
end $$;

-- Save a turn (or a build). A new conversation when session is null. The number of turns today is returned, for the limit.
create function consult_save(key text, exhibitor uuid, session uuid, turns jsonb, draft jsonb, built jsonb, tin int, tout int)
returns jsonb language plpgsql security definer set search_path = public as $$
#variable_conflict use_variable
declare sid uuid := session;
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  if sid is null then
    insert into consult_sessions (exhibitor_id, turns, draft, built, tokens_in, tokens_out) values (exhibitor, turns, draft, built, tin, tout) returning id into sid;
  else
    update consult_sessions set turns = consult_save.turns, draft = consult_save.draft, built = coalesce(consult_save.built, consult_sessions.built),
      tokens_in = tokens_in + tin, tokens_out = tokens_out + tout, updated_at = now()
    where id = sid and exhibitor_id = exhibitor;
  end if;
  return jsonb_build_object('id', sid);
end $$;

-- How many of his turns went to Claude today, across his conversations: a booth that runs away is stopped, not billed.
create function consult_today(key text, exhibitor uuid) returns int language plpgsql stable security definer set search_path = public as $$
begin
  if not wa_ok(key) then raise exception 'not allowed'; end if;
  return coalesce((select sum(jsonb_array_length(c.turns)) from consult_sessions c
    where c.exhibitor_id = exhibitor and c.updated_at > (date_trunc('day', now() at time zone 'Asia/Jerusalem') at time zone 'Asia/Jerusalem')), 0)::int;
end $$;

revoke all on function consult_get(text, uuid, uuid), consult_save(text, uuid, uuid, jsonb, jsonb, jsonb, int, int), consult_today(text, uuid) from public, authenticated;
grant execute on function consult_get(text, uuid, uuid), consult_save(text, uuid, uuid, jsonb, jsonb, jsonb, int, int), consult_today(text, uuid) to anon;
