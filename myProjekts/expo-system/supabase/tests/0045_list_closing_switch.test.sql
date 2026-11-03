-- The test of 0045 (the community list closes by the admin's button, and he can keep it open for one exhibitor). It
-- runs in one transaction and rolls it back, so it leaves nothing behind; it raises on the first failure, and prints
-- "0045 ok" when all pass. Run it in the SQL editor or through the Supabase tool, after the migration.
-- It needs one exhibitor in the database, any one: inside the transaction he is approved, his exception is cleared and
-- the system is live. The visitor it searches for ('דוד בדיקה') and the admin it signs in as are made up here. It signs
-- in by setting the request's claims, as Supabase does for a call from the app: the exhibitor's own id, with a made-up
-- mail that is not an admin's, or with the made-up admin's mail.
begin;
do $$
declare
  ex uuid; own uuid; who uuid; lost uuid; got leads%rowtype; since timestamptz;
  as_exhibitor text; as_admin text;
begin
  select e.id, e.owner into ex, own from exhibitors e order by e.created_at limit 1;
  if ex is null then raise exception 'no exhibitor in the database: nothing to test with'; end if;
  as_exhibitor := json_build_object('sub', own, 'email', 'exhibitor@test.invalid', 'role', 'authenticated')::text;
  as_admin := json_build_object('sub', own, 'email', 'admin@test.invalid', 'role', 'authenticated')::text;
  insert into admins (email) values ('admin@test.invalid');
  update exhibitors set approved = true, list_keep_open = false where id = ex;
  -- live since long ago, so that the leads below are not practice (0031 marks them by live_since, null before the switch)
  update system_state set phase = 'live', live_since = '2000-01-01', list_closed_at = null where id = 1;
  insert into people (full_name, city, phone) values ('דוד בדיקה', 'עיר בדיקה', '0500000000') returning id into who;
  perform set_config('request.jwt.claim.sub', own::text, true);
  perform set_config('request.jwt.claims', as_exhibitor, true);
  assert my_exhibitor() = ex and not is_admin(), 'signed in as the exhibitor, not as an admin';

  -- open by default
  assert (select list_closed_at from system_state where id = 1) is null, 'open: no closing time';
  assert list_open_for(ex), 'open for the exhibitor';
  assert exists (select 1 from search_people('דוד בדיקה') where id = who), 'open: the search finds him';
  assert exists (select 1 from people_directory() where id = who), 'open: the directory has him';

  -- the exhibitor cannot press the admin's buttons
  begin
    perform admin_set_list(true);
    raise exception 'an exhibitor closed the list';
  exception when others then
    if sqlerrm <> 'not allowed' then raise; end if;
  end;
  begin
    perform admin_list_keep_open(ex, true);
    raise exception 'an exhibitor kept the list open for himself';
  exception when others then
    if sqlerrm <> 'not allowed' then raise; end if;
  end;

  -- the admin closes it: the closing time is now, and pressing again keeps the first one
  perform set_config('request.jwt.claims', as_admin, true);
  assert is_admin(), 'signed in as the admin';
  since := admin_set_list(true);
  assert since = now(), 'closing sets the time to now';
  assert admin_set_list(true) = since, 'closing again keeps the first time';

  -- closed: the exhibitor finds no one
  perform set_config('request.jwt.claims', as_exhibitor, true);
  assert not list_open_for(ex), 'closed for the exhibitor';
  assert not list_open_for(ex, now() + interval '1 minute'), 'closed later too';
  assert list_open_for(ex, now() - interval '1 minute'), 'open for what was recorded before the closing';
  assert not exists (select 1 from search_people('דוד בדיקה')), 'closed: the search finds no one';
  assert not exists (select 1 from people_directory() where id = who), 'closed: the directory does not have him';

  -- the admin always sees
  perform set_config('request.jwt.claims', as_admin, true);
  assert exists (select 1 from search_people('דוד בדיקה') where id = who), 'closed: the admin still finds him';
  assert exists (select 1 from people_directory() where id = who), 'closed: the admin still has the directory';
  insert into leads (id, exhibitor_id, person_id, captured_at, captured_on)
    values (gen_random_uuid(), ex, who, now() + interval '1 hour', current_date) returning * into got;
  assert got.person_id = who, 'closed: a visitor the admin records keeps his link';

  -- recorded at the booth before the closing and sent later: keeps its link
  perform set_config('request.jwt.claims', as_exhibitor, true);
  insert into leads (id, exhibitor_id, person_id, captured_at, captured_on)
    values (gen_random_uuid(), ex, who, now() - interval '1 hour', current_date) returning * into got;
  assert got.person_id = who, 'a visitor recorded before the closing keeps his link';
  assert got.typed_name is null, 'and gets no typed name';
  -- one he gathered stays in his directory, for his CRM, but the search still finds no one
  assert exists (select 1 from people_directory() where id = who), 'closed: the directory keeps a visitor he gathered';
  assert not exists (select 1 from search_people('דוד בדיקה')), 'closed: the search still finds no one';

  -- recorded after the closing: keeps only his name
  insert into leads (id, exhibitor_id, person_id, captured_at, captured_on)
    values (gen_random_uuid(), ex, who, now() + interval '1 hour', current_date) returning * into got;
  assert got.person_id is null, 'a visitor recorded after the closing is linked to no one';
  assert got.typed_name = 'דוד בדיקה', 'and keeps the name from the list';
  lost := got.id;

  -- a name typed at the booth wins over the list's
  insert into leads (id, exhibitor_id, person_id, typed_name, captured_at, captured_on)
    values (gen_random_uuid(), ex, who, 'משה בדיקה', now() + interval '1 hour', current_date) returning * into got;
  assert got.person_id is null and got.typed_name = 'משה בדיקה', 'a typed name stays';

  -- a typed visitor is not touched
  insert into leads (id, exhibitor_id, typed_name, typed_phone, captured_at, captured_on)
    values (gen_random_uuid(), ex, 'דוד בדיקה', '0500000000', now() + interval '1 hour', current_date) returning * into got;
  assert got.person_id is null and got.typed_name = 'דוד בדיקה' and got.typed_phone = '0500000000', 'a typed visitor stays as he is';

  -- a link added after the closing to a visitor recorded before it is judged by now: it is not kept
  update leads set person_id = who where id = got.id returning * into got;
  assert got.person_id is null, 'a link added after the closing is not kept';

  -- kept open for this exhibitor: he still searches, and links
  perform set_config('request.jwt.claims', as_admin, true);
  perform admin_list_keep_open(ex, true);
  perform set_config('request.jwt.claims', as_exhibitor, true);
  assert (select list_keep_open from exhibitors where id = ex), 'the exception is on his row';
  assert list_open_for(ex), 'kept open for him';
  assert exists (select 1 from search_people('דוד בדיקה') where id = who), 'kept open: the search finds him';
  assert exists (select 1 from people_directory() where id = who), 'kept open: the directory has him';
  insert into leads (id, exhibitor_id, person_id, captured_at, captured_on)
    values (gen_random_uuid(), ex, who, now() + interval '1 hour', current_date) returning * into got;
  assert got.person_id = who, 'kept open: a visitor recorded after the closing keeps his link';
  perform set_config('request.jwt.claims', as_admin, true);
  perform admin_list_keep_open(ex, false);
  perform set_config('request.jwt.claims', as_exhibitor, true);
  assert not list_open_for(ex), 'the exception taken back: closed for him again';

  -- opened again: everyone searches; whoever lost his link while it was closed stays without it
  perform set_config('request.jwt.claims', as_admin, true);
  assert admin_set_list(false) is null, 'opening clears the closing time';
  perform set_config('request.jwt.claims', as_exhibitor, true);
  assert list_open_for(ex), 'opened again for the exhibitor';
  assert exists (select 1 from search_people('דוד בדיקה') where id = who), 'opened again: the search finds him';
  assert exists (select 1 from people_directory() where id = who), 'opened again: the directory has him';
  assert (select person_id from leads where id = lost) is null, 'what lost its link while closed stays without it';

  raise notice '0045 ok';
end $$;
rollback;
