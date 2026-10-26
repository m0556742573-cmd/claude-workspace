-- An exhibitor is opened only by the admin (server side). A signed-in user may read and update his own row,
-- never create one: otherwise anyone who signs in could reach the community names.
drop policy own on exhibitors;
create policy own_read on exhibitors for select using (owner = auth.uid());
create policy own_update on exhibitors for update using (owner = auth.uid()) with check (owner = auth.uid());
