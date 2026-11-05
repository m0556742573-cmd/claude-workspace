-- "לא ענה" (יצחק, 5/11): whether to keep trying is the exhibitor's decision, per visitor, by how much he is worth to him.
-- Two outcomes of a step of their own:
--   missed  he called, met or waited and did not get through, and has not chosen yet what now: the visitor waits for his
--           decision ("מחכה להחלטה", a state in the dashboard), with nothing planned for him. ('noAnswer' keeps its old
--           meaning: done, the path goes on; the server marks every message it sent so, and the two never mix.)
--   gaveUp  he chose to stop trying: the path ends there, and what was planned for him and not yet sent is cancelled,
--           as for a deal or "not relevant".
-- Trying again is a manual step (manual_steps), as before; going on with the path is a row go:<step>.

alter table lead_steps drop constraint lead_steps_outcome_check;
alter table lead_steps add constraint lead_steps_outcome_check
  check (outcome in ('engaged', 'noAnswer', 'closed', 'notRelevant', 'optOut', 'gaveUp', 'missed'));

create or replace function cancel_planned() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.outcome in ('engaged', 'closed', 'notRelevant', 'optOut', 'gaveUp') then
    update outbox set status = 'cancelled', error = 'lead_moved_on' where lead_id = new.lead_id and step_id is not null and status = 'queued';
  end if;
  return new;
end $$;
