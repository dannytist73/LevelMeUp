-- M7a, the check-in (plan decisions 2–9): a check-in is answered, then resolved (at once, or when the recovery day of
-- "I just didn't" ends); a check-in answer can make the next day light; the lighter-plan offer remembers its last answer.
-- `adjust` takes the kinds `checkin` and `lighter_plan`; `advance` applies the days that waited behind a check-in,
-- opens the check-ins that replay finds, settles "I just didn't", and records Unbreakable (otherwise as 0010 and 0003).

alter table levelmeup.checkins
  add column recovery_day_id bigint,
  add column resolved_at timestamptz,
  add column outcome text check (outcome in ('protected', 'recovered', 'unbreakable', 'shield', 'reset')),
  add constraint checkins_resolved check ((outcome is null) = (resolved_at is null)),
  add constraint checkins_recovery_day foreign key (recovery_day_id, user_id)
    references levelmeup.quest_days (id, user_id) on delete cascade;

alter table levelmeup.character_state add column next_day_light boolean not null default false;
alter table levelmeup.profiles add column lighter_plan_at timestamptz;

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
  if p_type not in ('swap', 'hard_day', 'plan_rest', 'pain', 'resume', 'step_down', 'class_change', 'ability', 'training', 'book',
    'checkin', 'lighter_plan') then
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
  elsif jsonb_array_length(coalesce(p_change -> 'quests', '[]')) > 0 or jsonb_typeof(p_change -> 'recovery') = 'object' then
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

  -- M7a: the recovery quest after "I just didn't" (decision 4), on the day the change names; one per day (unique slot).
  if jsonb_typeof(p_change -> 'recovery') = 'object' then
    insert into levelmeup.quest_instances (day_id, user_id, slot, template_id, ladder_id, rung, stat, tier, minutes, completion,
      condition, hard_day, xp, why, book)
    select d.id, p_user, 'recovery', r."templateId", r.ladder, r.rung, r.stat, r.tier, r.minutes, r.completion, r.condition,
      coalesce(r."hardDay", false), r.xp, r.why, r.book
    from jsonb_to_record(p_change -> 'recovery') as r("templateId" text, ladder text, rung smallint, stat text, tier text,
      minutes smallint, completion text, condition jsonb, "hardDay" boolean, xp jsonb, why jsonb, book text);
  end if;

  -- M7a: the check-in's answer. Only this player's unanswered check-in takes one; a recovery day is the changed day.
  if jsonb_typeof(p_change -> 'checkin') = 'object' then
    if (p_change -> 'checkin' ->> 'recoveryDayId') is not null
      and (d.id is null or (p_change -> 'checkin' ->> 'recoveryDayId')::bigint <> d.id) then
      raise exception 'lmu:bad_change';
    end if;
    update levelmeup.checkins set
      answer = p_change -> 'checkin' ->> 'answer',
      answered_at = now(),
      recovery_day_id = (p_change -> 'checkin' ->> 'recoveryDayId')::bigint,
      outcome = p_change -> 'checkin' ->> 'outcome',
      resolved_at = case when p_change -> 'checkin' ->> 'outcome' is null then null else now() end
    where id = (p_change -> 'checkin' ->> 'id')::bigint and user_id = p_user and answer is null;
    if not found then raise exception 'lmu:already_answered'; end if;
  end if;

  if jsonb_typeof(p_change -> 'streak') = 'object' then
    update levelmeup.character_state set
      streak_current = (p_change -> 'streak' ->> 'current')::int,
      streak_best = (p_change -> 'streak' ->> 'best')::int,
      shields = (p_change -> 'streak' ->> 'shields')::smallint,
      awaiting_checkin = (p_change -> 'streak' ->> 'awaitingCheckin')::boolean
    where user_id = p_user;
  end if;
  if p_change ? 'minutes' then
    update levelmeup.profiles set minutes_per_day = (p_change ->> 'minutes')::int where user_id = p_user;
  end if;
  if coalesce((p_change ->> 'lighterPlanAt')::boolean, false) then
    update levelmeup.profiles set lighter_plan_at = now() where user_id = p_user;
  end if;
  if coalesce((p_change ->> 'lightNext')::boolean, false) then
    update levelmeup.character_state set next_day_light = true where user_id = p_user;
  end if;

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

  -- Day-shaping abilities (M6b) and Second Wind (M7a). Unbreakable is never a player's change: `advance` records it.
  if jsonb_typeof(p_change -> 'ability') = 'object' then
    if (p_change -> 'ability' ->> 'id') not in ('stillness', 'dawn_ritual', 'second_wind') then raise exception 'lmu:bad_change'; end if;
    update levelmeup.character_state
    set ability_last_used = ability_last_used || jsonb_build_object(p_change -> 'ability' ->> 'id', (p_change -> 'ability' ->> 'day')::int)
    where user_id = p_user;
  end if;

  v := levelmeup.bump(p_user);
  outcome := jsonb_build_object('type', p_type, 'version', v);
  insert into levelmeup.events (user_id, client_event_id, type, payload, result) values (p_user, p_event, p_type, p_payload, outcome);
  return outcome;
end $$;

-- Lazy day closing and the next day (architecture §4.3), computed by _shared/advance.ts from the state it read at
-- p_version. Fails with lmu:conflict if anything was written since, so the caller re-reads and recomputes.
create or replace function levelmeup.advance(p_user uuid, p_version int, p_outcome jsonb)
returns jsonb language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  c record;
  d levelmeup.quest_days;
  l record;
  inserted int;
  new_day jsonb := p_outcome -> 'newDay';
  day bigint;
  v int;
begin
  if levelmeup.lock_player(p_user) <> p_version then raise exception 'lmu:conflict'; end if;

  for c in
    select * from jsonb_to_recordset(coalesce(p_outcome -> 'close', '[]'))
      as x("dayId" bigint, resolution text, "streakApplied" boolean, checkin boolean)
  loop
    select * into d from levelmeup.quest_days where id = c."dayId" and user_id = p_user;
    if not found then raise exception 'lmu:not_found'; end if;
    if d.status <> 'open' then raise exception 'lmu:not_open'; end if;
    if d.ends_at > now() then raise exception 'lmu:not_ended'; end if;
    if exists (select 1 from levelmeup.quest_days where user_id = p_user and day_number < d.day_number and status = 'open') then
      raise exception 'lmu:out_of_order';
    end if;
    update levelmeup.quest_days
    set status = 'closed', resolution = c.resolution, streak_applied = coalesce(c."streakApplied", false), closed_at = now()
    where id = d.id;
    if coalesce(c.checkin, false) then insert into levelmeup.checkins (user_id, day_id) values (p_user, d.id); end if;
  end loop;

  if jsonb_typeof(p_outcome -> 'gap') = 'object' then
    insert into levelmeup.checkins (user_id, gap_from, gap_to)
    values (p_user, (p_outcome -> 'gap' ->> 'from')::int, (p_outcome -> 'gap' ->> 'to')::int);
  end if;

  -- M7a (decision 5): days that waited behind a check-in, now applied to the streak in order, and the check-ins that
  -- replay opened (a missed day, or away days between two days). The foreign key keeps a day check-in on this player.
  update levelmeup.quest_days set streak_applied = true
  where user_id = p_user and status = 'closed' and not streak_applied
    and id in (select (x #>> '{}')::bigint from jsonb_array_elements(coalesce(p_outcome -> 'applied', '[]')) x);
  insert into levelmeup.checkins (user_id, day_id, gap_from, gap_to)
  select p_user, (x ->> 'dayId')::bigint, (x ->> 'gapFrom')::int, (x ->> 'gapTo')::int
  from jsonb_array_elements(coalesce(p_outcome -> 'opened', '[]')) x;

  -- "I just didn't", settled when its recovery day ended (decision 4); Unbreakable's use (decision 8).
  if jsonb_typeof(p_outcome -> 'resolved') = 'object' then
    update levelmeup.checkins set resolved_at = now(), outcome = p_outcome -> 'resolved' ->> 'outcome'
    where id = (p_outcome -> 'resolved' ->> 'id')::bigint and user_id = p_user and answer = 'just_didnt' and resolved_at is null;
    if not found then raise exception 'lmu:not_found'; end if;
  end if;
  if jsonb_typeof(p_outcome -> 'ability') = 'object' then
    if (p_outcome -> 'ability' ->> 'id') <> 'unbreakable' then raise exception 'lmu:bad_change'; end if;
    update levelmeup.character_state
    set ability_last_used = ability_last_used || jsonb_build_object('unbreakable', (p_outcome -> 'ability' ->> 'day')::int)
    where user_id = p_user;
  end if;

  insert into levelmeup.ladder_states (user_id, ladder_id, state, updated_at)
  select p_user, x.key, x.value, now() from jsonb_each(coalesce(p_outcome -> 'ladders', '{}')) x
  on conflict (user_id, ladder_id) do update set state = excluded.state, updated_at = excluded.updated_at;

  -- Rung bonuses, Discipline and streak milestones. A key already in the ledger is never paid again.
  for l in
    select * from jsonb_to_recordset(coalesce(p_outcome -> 'ledger', '[]'))
      as x("sourceType" text, "sourceId" text, stat text, amount int)
  loop
    if l."sourceType" not in ('rung', 'discipline', 'milestone') or l.amount <= 0 or l.amount > 200 then
      raise exception 'lmu:bad_ledger';
    end if;
    insert into levelmeup.xp_ledger (user_id, source_type, source_id, stat, amount)
    values (p_user, l."sourceType", l."sourceId", l.stat, l.amount)
    on conflict (user_id, source_type, source_id, stat) do nothing;
    get diagnostics inserted = row_count;
    if inserted = 1 then perform levelmeup.add_xp(p_user, jsonb_build_object(l.stat, l.amount), 1); end if;
  end loop;

  if jsonb_typeof(p_outcome -> 'streak') = 'object' then
    update levelmeup.character_state set
      streak_current = (p_outcome -> 'streak' ->> 'current')::int,
      streak_best = (p_outcome -> 'streak' ->> 'best')::int,
      shields = (p_outcome -> 'streak' ->> 'shields')::smallint,
      awaiting_checkin = (p_outcome -> 'streak' ->> 'awaitingCheckin')::boolean
    where user_id = p_user;
  end if;
  update levelmeup.character_state set
    hard_days_cleared = hard_days_cleared + coalesce((p_outcome -> 'counters' ->> 'hardDaysCleared')::int, 0),
    comebacks = comebacks + coalesce((p_outcome -> 'counters' ->> 'comebacks')::int, 0),
    recoveries_cleared = recoveries_cleared + coalesce((p_outcome -> 'counters' ->> 'recoveriesCleared')::int, 0)
  where user_id = p_user;
  if coalesce((p_outcome ->> 'lightUsed')::boolean, false) then
    update levelmeup.character_state set next_day_light = false where user_id = p_user;
  end if;

  if jsonb_typeof(new_day) = 'object' then
    if exists (select 1 from levelmeup.quest_days where user_id = p_user and status = 'open') then raise exception 'lmu:out_of_order'; end if;
    if exists (select 1 from levelmeup.quest_days where user_id = p_user and day_number >= (new_day ->> 'dayNumber')::int) then
      raise exception 'lmu:day_exists';
    end if;
    if (new_day ->> 'startsAt')::timestamptz < (select max(ends_at) from levelmeup.quest_days where user_id = p_user) then
      raise exception 'lmu:overlap';
    end if;
    day := levelmeup.insert_day(p_user, new_day);
  end if;

  v := levelmeup.bump(p_user);
  return jsonb_build_object('version', v, 'newDayId', day);
end $$;

revoke all on all functions in schema levelmeup from public, anon, authenticated;
grant execute on function levelmeup.adjust(uuid, uuid, int, text, jsonb, jsonb) to lmu_service;
grant execute on function levelmeup.advance(uuid, int, jsonb) to lmu_service;
