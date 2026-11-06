-- 0051 (6/11, the database permissions review, s-rls; יצחק: "כן, להתחיל"). Two fixes. The rest of the review found nothing to change.

-- 1. The control center's daily-run key (hq, אתר y-h-m/admin/db/0004_inside.sql) was never created, so the key check
--    compared against nothing and answered null. "if not null" does not stop, so any key of 32 characters or more
--    passed. With the public key from the site, anyone could call hq_sync, hq_daily and hq_run_note and change the
--    control center's records (renewal dates, amounts, "no longer exists") or add notes. Nothing of the exhibitors,
--    and nothing could be read. Now a missing key stops everything. Once the daily run gets its key
--    (deploy.sh --sync-key), it works as planned.
create or replace function hq.sync_ok(p_key text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(p_key is not null and length(p_key) >= 32
     and encode(sha256(convert_to(p_key, 'UTF8')), 'hex') = (select value from hq.settings where key = 'sync_key_sha256'), false);
$$;

-- 2. Four tables checked only that a row is the exhibitor's own, not that its lead is. One exhibitor could attach a
--    task, a step, a note or a reply to another exhibitor's lead, if he knew its id. The ids cannot be guessed, so this
--    is a second lock, the same check lead_contacts already has (0021).
drop policy own on tasks;
create policy own on tasks for all
  using (exhibitor_id = my_exhibitor())
  with check (exhibitor_id = my_exhibitor() and exists (select 1 from leads l where l.id = tasks.lead_id and l.exhibitor_id = my_exhibitor()));

drop policy own on manual_steps;
create policy own on manual_steps for all
  using (exhibitor_id = my_exhibitor())
  with check (exhibitor_id = my_exhibitor() and exists (select 1 from leads l where l.id = manual_steps.lead_id and l.exhibitor_id = my_exhibitor()));

drop policy own on lead_notes;
create policy own on lead_notes for all
  using (exhibitor_id = my_exhibitor())
  with check (exhibitor_id = my_exhibitor() and exists (select 1 from leads l where l.id = lead_notes.lead_id and l.exhibitor_id = my_exhibitor()));

drop policy own on replies;
create policy own on replies for all
  using (exhibitor_id = my_exhibitor())
  with check (exhibitor_id = my_exhibitor() and exists (select 1 from leads l where l.id = replies.lead_id and l.exhibitor_id = my_exhibitor()));
