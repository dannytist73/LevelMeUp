-- M6d, Scholar's Path (decision 12): the current book's start, and the finished books (the newest 100, oldest first,
-- times as ISO strings). The `book` adjustment sets, finishes or sets aside the book (adjust; otherwise as 0009).

alter table levelmeup.profiles
  add column book_started_at timestamptz,
  add column books_finished jsonb not null default '[]'::jsonb
    check (case when jsonb_typeof(books_finished) = 'array' then jsonb_array_length(books_finished) <= 100 else false end);

create or replace function levelmeup.adjust(p_user uuid, p_event uuid, p_version int, p_type text, p_payload jsonb, p_change jsonb)
returns jsonb language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  v int;
  e levelmeup.events;
  d levelmeup.quest_days;
  q record;
  cur levelmeup.quest_instances;
  changed_at timestamptz;
  outcome jsonb;
  prof levelmeup.profiles;
  n_sessions int;
  n_minutes int;
begin
  v := levelmeup.lock_player(p_user);
  -- A repeat returns what it returned the first time, whatever has happened since; the same id for anything else is refused.
  select * into e from levelmeup.events where user_id = p_user and client_event_id = p_event;
  if found then
    if e.type <> p_type or e.payload <> p_payload then raise exception 'lmu:event_reused'; end if;
    return e.result;
  end if;
  if p_type not in ('swap', 'hard_day', 'plan_rest', 'pain', 'resume', 'step_down', 'class_change', 'ability', 'training', 'book') then
    raise exception 'lmu:bad_change';
  end if;
  if v <> p_version then raise exception 'lmu:conflict'; end if;

  if jsonb_typeof(p_change -> 'day') = 'object' then
    select * into d from levelmeup.quest_days where id = (p_change -> 'day' ->> 'id')::bigint and user_id = p_user;
    if not found then raise exception 'lmu:not_found'; end if;
    if d.status <> 'open' or now() >= d.ends_at then raise exception 'lmu:day_closed'; end if;
    if (p_change -> 'day' ->> 'protection') not in ('planned_rest', 'pain') then
      raise exception 'lmu:bad_change';
    end if;
    update levelmeup.quest_days set
      hard_day = hard_day or coalesce((p_change -> 'day' ->> 'hardDay')::boolean, false),
      protection = coalesce(protection, p_change -> 'day' ->> 'protection'),
      swaps_used = swaps_used + coalesce((p_change -> 'day' ->> 'swaps')::int, 0)
    where id = d.id;
  elsif jsonb_array_length(coalesce(p_change -> 'quests', '[]')) > 0 then
    raise exception 'lmu:bad_change'; -- quests change only on a day the change names
  end if;

  for q in
    select * from jsonb_to_recordset(coalesce(p_change -> 'quests', '[]')) as x(id bigint, slot text, "templateId" text,
      ladder text, rung smallint, stat text, tier text, minutes smallint, completion text, condition jsonb, "hardDay" boolean,
      xp jsonb, why jsonb, book text)
  loop
    select * into cur from levelmeup.quest_instances where id = q.id and user_id = p_user and day_id = d.id;
    if not found then raise exception 'lmu:not_found'; end if;
    if cur.completed_at is not null then raise exception 'lmu:already_completed'; end if;
    if q.slot is distinct from cur.slot or cur.slot not in ('core', 'side1', 'side2') then raise exception 'lmu:bad_change'; end if;
    update levelmeup.quest_instances set
      template_id = q."templateId", ladder_id = q.ladder, rung = q.rung, stat = q.stat, tier = q.tier, minutes = q.minutes,
      completion = q.completion, condition = q.condition, hard_day = coalesce(q."hardDay", false), xp = q.xp, why = q.why,
      book = q.book
    where id = cur.id;
  end loop;

  insert into levelmeup.ladder_states (user_id, ladder_id, state, updated_at)
  select p_user, x.key, x.value, now() from jsonb_each(coalesce(p_change -> 'ladders', '{}')) x
  on conflict (user_id, ladder_id) do update set state = excluded.state, updated_at = excluded.updated_at;

  if p_change ->> 'classId' is not null then
    select class_changed_at into changed_at from levelmeup.profiles where user_id = p_user;
    if changed_at is not null and now() < changed_at + interval '14 days' then raise exception 'lmu:class_locked'; end if;
    update levelmeup.profiles set class_id = p_change ->> 'classId', class_changed_at = now() where user_id = p_user;
  end if;

  -- M6c: the training setup; the table's checks refuse unknown equipment or styles.
  if jsonb_typeof(p_change -> 'training') = 'object' then
    update levelmeup.profiles set
      equipment = array(select jsonb_array_elements_text(coalesce(p_change -> 'training' -> 'equipment', '[]'))),
      program_style = p_change -> 'training' ->> 'programStyle'
    where user_id = p_user;
  end if;

  -- M6d: Scholar's Path. Finishing records the current book with the quests read since it was set; then the next book
  -- (or none) is set. The table's check refuses a title over 120 characters.
  if jsonb_typeof(p_change -> 'book') = 'object' then
    select * into prof from levelmeup.profiles where user_id = p_user;
    if coalesce((p_change -> 'book' ->> 'finished')::boolean, false) then
      if prof.book is null then raise exception 'lmu:bad_change'; end if;
      select count(*)::int, coalesce(sum(minutes), 0)::int into n_sessions, n_minutes from levelmeup.quest_instances
      where user_id = p_user and book = prof.book and completed_at is not null
        and completed_at >= coalesce(prof.book_started_at, '-infinity'::timestamptz);
      update levelmeup.profiles set books_finished = (
          select coalesce(jsonb_agg(t.e order by t.i), '[]'::jsonb)
          from jsonb_array_elements(prof.books_finished) with ordinality as t(e, i)
          where t.i > jsonb_array_length(prof.books_finished) - 99
        ) || jsonb_build_array(jsonb_build_object(
          'title', prof.book,
          'startedAt', to_char(prof.book_started_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'finishedAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'sessions', n_sessions, 'minutes', n_minutes))
      where user_id = p_user;
    end if;
    update levelmeup.profiles set
      book = p_change -> 'book' ->> 'title',
      book_started_at = case when p_change -> 'book' ->> 'title' is null then null else now() end
    where user_id = p_user;
  end if;

  if jsonb_typeof(p_change -> 'ability') = 'object' then
    if (p_change -> 'ability' ->> 'id') not in ('stillness', 'dawn_ritual') then raise exception 'lmu:bad_change'; end if;
    update levelmeup.character_state
    set ability_last_used = ability_last_used || jsonb_build_object(p_change -> 'ability' ->> 'id', (p_change -> 'ability' ->> 'day')::int)
    where user_id = p_user;
  end if;

  v := levelmeup.bump(p_user);
  outcome := jsonb_build_object('type', p_type, 'version', v);
  insert into levelmeup.events (user_id, client_event_id, type, payload, result) values (p_user, p_event, p_type, p_payload, outcome);
  return outcome;
end $$;

revoke all on all functions in schema levelmeup from public, anon, authenticated;
grant execute on function levelmeup.adjust(uuid, uuid, int, text, jsonb, jsonb) to lmu_service;
