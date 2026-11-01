-- 0043: the trial's ten are the last ten, not the first (יצחק, 1/11). He linked his WhatsApp after ten trial visitors
-- from earlier tries, and the two he added then got nothing: with the first ten, a booth that tried once could not try
-- again. Now a new trial visitor always sends, and an older one beyond the ten stops (its queued messages too, as they
-- are checked again when they go). Still at most ten paths at once, all to the exhibitor himself.
create or replace function trial_lead(lead uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select current_phase() = 'practice' and exists (
    select 1 from leads l join exhibitors e on e.id = l.exhibitor_id
    where l.id = lead and l.practice and e.trial_send
      and l.id in (select x.id from leads x where x.exhibitor_id = l.exhibitor_id and x.practice order by x.captured_at desc, x.id desc limit 10))
$$;

revoke all on function trial_lead(uuid) from public, anon, authenticated;
