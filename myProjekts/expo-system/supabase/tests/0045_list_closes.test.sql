-- The test of 0045 (the community list closes on 19/11). It runs in one transaction and rolls it back, so it leaves
-- nothing behind; it raises on the first failure, and prints "0045 ok" when all pass. Run it in the SQL editor or
-- through the Supabase tool, after the migration. It runs as the database owner, who is not the admin, so the trigger
-- treats it as an exhibitor. Today (1/11) the list is open, so a link that changes after the close is not tested here.
begin;
do $$
declare
  ex uuid := (select id from exhibitors order by id limit 1);
  who uuid := (select id from people limit 1);
  name text := (select full_name from people limit 1);
  got leads%rowtype;
begin
  assert list_open('2026-11-18 23:59+02'), 'the list is open on the evening of 18/11';
  assert not list_open('2026-11-19 00:00+02'), 'the list is closed from 19/11';
  assert not list_open('2026-11-18 22:30+00'), 'Israel time: half past midnight on 19/11 is closed';
  assert list_open('2026-11-16 09:00+02'), 'the list is open on the day of the fair';
  if ex is null or who is null then raise notice 'no exhibitor or no person: the trigger is not tested'; return; end if;

  -- recorded at the booth before the close and sent later: keeps its link
  insert into leads (id, exhibitor_id, person_id, captured_at, captured_on)
    values (gen_random_uuid(), ex, who, '2026-11-17 12:00+02', '2026-11-17') returning * into got;
  assert got.person_id = who, 'a visitor recorded before the close keeps his link';
  assert got.typed_name is null, 'and gets no typed name';

  -- recorded after the close: keeps only his name
  insert into leads (id, exhibitor_id, person_id, captured_at, captured_on)
    values (gen_random_uuid(), ex, who, '2026-11-20 12:00+02', '2026-11-20') returning * into got;
  assert got.person_id is null, 'a visitor recorded after the close is linked to no one';
  assert got.typed_name = name, 'and keeps the name from the list';

  -- a name typed at the booth wins over the list's
  insert into leads (id, exhibitor_id, person_id, typed_name, captured_at, captured_on)
    values (gen_random_uuid(), ex, who, 'משה בדיקה', '2026-11-20 12:00+02', '2026-11-20') returning * into got;
  assert got.typed_name = 'משה בדיקה', 'a typed name stays';

  -- a typed visitor is not touched
  insert into leads (id, exhibitor_id, typed_name, typed_phone, captured_at, captured_on)
    values (gen_random_uuid(), ex, 'דוד בדיקה', '0500000000', '2026-11-20 12:00+02', '2026-11-20') returning * into got;
  assert got.person_id is null and got.typed_name = 'דוד בדיקה', 'a typed visitor stays as he is';

  raise notice '0045 ok';
end $$;
rollback;
