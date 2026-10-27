-- A change in the middle of the fair (model, section 13): the exhibitor chooses whether it applies to the visitors
-- already registered or only to the next ones. "Only the next ones" pins the existing leads to the version they had.
alter table leads add column setup_version int;
comment on column leads.setup_version is 'null = the active setup; a number = the setup version this lead stays on, when a change mid-fair was applied to new visitors only';
