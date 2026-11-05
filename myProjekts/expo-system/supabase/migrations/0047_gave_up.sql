-- "לא ענה" (יצחק, 5/11): whether to keep trying is the exhibitor's decision, per visitor, by how much he is worth to him.
-- Trying again is a manual step (manual_steps), as before. Giving up is a step's outcome of its own: the path ends there,
-- and what was planned for him and not yet sent is cancelled, as for a deal or "not relevant".

alter table lead_steps drop constraint lead_steps_outcome_check;
alter table lead_steps add constraint lead_steps_outcome_check
  check (outcome in ('engaged', 'noAnswer', 'closed', 'notRelevant', 'optOut', 'gaveUp'));

create or replace function cancel_planned() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.outcome in ('engaged', 'closed', 'notRelevant', 'optOut', 'gaveUp') then
    update outbox set status = 'cancelled', error = 'lead_moved_on' where lead_id = new.lead_id and step_id is not null and status = 'queued';
  end if;
  return new;
end $$;
