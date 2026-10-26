-- Steps set by hand after a talk, notes (typed or spoken), and the voice recordings themselves.
create table manual_steps (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  exhibitor_id uuid not null references exhibitors (id) on delete cascade,
  action text not null check (action in ('talk', 'meet', 'prepare', 'send', 'reserve', 'check', 'wait')),
  who text not null default 'me' check (who in ('me', 'auto')),
  due_on date not null,
  message text,
  created_at timestamptz not null default now()
);
create index manual_steps_lead on manual_steps (lead_id);

create table lead_notes (
  id uuid primary key,                 -- made on the phone, like the lead
  lead_id uuid not null references leads (id) on delete cascade,
  exhibitor_id uuid not null references exhibitors (id) on delete cascade,
  body text,
  audio_path text,                     -- in the storage bucket "voice"
  transcript text,
  created_at timestamptz not null default now()
);
create index lead_notes_lead on lead_notes (lead_id);

alter table manual_steps enable row level security;
alter table lead_notes enable row level security;
create policy own on manual_steps for all using (exhibitor_id = my_exhibitor()) with check (exhibitor_id = my_exhibitor());
create policy own on lead_notes for all using (exhibitor_id = my_exhibitor()) with check (exhibitor_id = my_exhibitor());

-- Voice recordings: a private bucket; each exhibitor reaches only his own folder (the first part of the path is his id).
insert into storage.buckets (id, name, public) values ('voice', 'voice', false) on conflict (id) do nothing;
create policy voice_own_read on storage.objects for select to authenticated
  using (bucket_id = 'voice' and (storage.foldername(name))[1] = my_exhibitor()::text);
create policy voice_own_write on storage.objects for insert to authenticated
  with check (bucket_id = 'voice' and (storage.foldername(name))[1] = my_exhibitor()::text);
