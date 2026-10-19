-- M15, the weekly program (plan 2026-10-20-m15-weekly-program.md, decisions 1, 3 and 8): the player's training plan
-- (`build`, the M6c workouts, or `weekly`), its workouts a week, and when the weekly program was last switched on (its
-- run counts the weekly workouts completed since, `programRun`). The `training` adjustment writes them; otherwise
-- `adjust` is as 0013. A weekly workout is stored like any workout (quest_instances.condition, kind `session`, with its
-- block): no other schema change.

alter table levelmeup.profiles
  add column training_plan text not null default 'build' check (training_plan in ('build', 'weekly')),
  add column program_days smallint not null default 3 check (program_days in (2, 3)),
  add column program_since timestamptz;

comment on column levelmeup.profiles.training_plan is 'M15: build (workouts grow on readiness) or weekly (the weekly program).';
comment on column levelmeup.profiles.program_days is 'M15: the weekly program''s workouts a week, 2 or 3.';
comment on column levelmeup.profiles.program_since is
  'M15: when the weekly program was last switched on; its run counts the weekly workouts completed since. Null: never.';

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
  tapped timestamptz;
begin
  v := levelmeup.lock_player(p_user);
  -- A repeat returns what it returned the first time, whatever has happened since; the same id for anything else is refused.
  select * into e from levelmeup.events where user_id = p_user and client_event_id = p_event;
  if found then
    if e.type <> p_type or e.payload <> p_payload then raise exception 'lmu:event_reused'; end if;
    return e.result;
  end if;
  if p_type not in ('swap', 'hard_day', 'plan_rest', 'pain', 'resume', 'step_down', 'class_change', 'ability', 'training', 'book',
    'checkin', 'lighter_plan', 'settings', 'accountability_set', 'trial', 'checkin_note') then
    raise exception 'lmu:bad_change';
  end if;
  if v <> p_version then raise exception 'lmu:conflict'; end if;
  -- M7a: the check-in's keys come only with its kinds, Second Wind only with an answer, and an answer resolves at once
  -- only as protected (code review: defense in depth; the planner never sends anything else).
  if p_type not in ('checkin', 'lighter_plan')
    and p_change ?| array['checkin', 'recovery', 'streak', 'minutes', 'lighterPlanAt', 'lightNext'] then
    raise exception 'lmu:bad_change';
  end if;
  if (p_change -> 'ability' ->> 'id') = 'second_wind' and p_type <> 'checkin' then raise exception 'lmu:bad_change'; end if;
  if (p_change -> 'checkin' ->> 'outcome') <> 'protected' then raise exception 'lmu:bad_change'; end if;
  -- M7b: the settings come only with their kind, a planned rest day only with a rest.
  if p_change ? 'settings' and p_type <> 'settings' then raise exception 'lmu:bad_change'; end if;
  if p_change ? 'restDay' and p_type <> 'plan_rest' then raise exception 'lmu:bad_change'; end if;
  -- M7c: the pact (and the consequence it eases), the Trial and the note come only with their kinds.
  if p_change ?| array['pact', 'consequence'] and p_type <> 'accountability_set' then raise exception 'lmu:bad_change'; end if;
  if p_change ? 'trial' and p_type <> 'trial' then raise exception 'lmu:bad_change'; end if;
  if p_change ? 'note' and p_type <> 'checkin_note' then raise exception 'lmu:bad_change'; end if;

  if jsonb_typeof(p_change -> 'day') = 'object' then
    select * into d from levelmeup.quest_days where id = (p_change -> 'day' ->> 'id')::bigint and user_id = p_user;
    if not found then raise exception 'lmu:not_found'; end if;
    if d.status <> 'open' then raise exception 'lmu:day_closed'; end if;
    -- M7b (decision 6): a rest or pain report tapped while the day ran may arrive after it ended (an offline phone).
    -- Within 48 hours of its end it still protects the day, and changes nothing else.
    tapped := (p_change -> 'day' ->> 'tappedAt')::timestamptz;
    if now() >= d.ends_at and not coalesce(
      tapped >= d.starts_at and tapped < d.ends_at and now() < d.ends_at + interval '48 hours'
      and (p_change -> 'day' ->> 'protection') is not null
      and not ((p_change -> 'day') ?| array['hardDay', 'swaps'])
      and jsonb_array_length(coalesce(p_change -> 'quests', '[]')) = 0
      and p_change -> 'recovery' is null, false) then
      raise exception 'lmu:day_closed';
    end if;
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
    -- M7c (decision 4): a consequence comes only with "I just didn't" and its recovery day, under a pact of that level.
    if (p_change -> 'checkin' ->> 'consequence') is not null then
      select * into prof from levelmeup.profiles where user_id = p_user;
      if (p_change -> 'checkin' ->> 'answer') is distinct from 'just_didnt'
        or (p_change -> 'checkin' ->> 'recoveryDayId') is null
        or prof.accountability_level = 0 or prof.accountability_enabled_at is null
        or ((p_change -> 'checkin' ->> 'consequence') = 'trial' and prof.accountability_level <> 2) then
        raise exception 'lmu:bad_change';
      end if;
    end if;
    update levelmeup.checkins set
      answer = p_change -> 'checkin' ->> 'answer',
      answered_at = now(),
      recovery_day_id = (p_change -> 'checkin' ->> 'recoveryDayId')::bigint,
      outcome = p_change -> 'checkin' ->> 'outcome',
      resolved_at = case when p_change -> 'checkin' ->> 'outcome' is null then null else now() end,
      consequence = p_change -> 'checkin' ->> 'consequence'
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

  -- M7b (decision 5): a rest day planned for tomorrow, only ever the day after the player's latest.
  if p_change ? 'restDay' then
    if (p_change ->> 'restDay')::int is distinct from (select max(day_number) + 1 from levelmeup.quest_days where user_id = p_user) then
      raise exception 'lmu:bad_change';
    end if;
    update levelmeup.character_state set rest_day = (p_change ->> 'restDay')::int where user_id = p_user;
  end if;

  -- M7b (decision 2): the game settings; the table's checks refuse unknown voices, minutes, difficulties and times.
  if jsonb_typeof(p_change -> 'settings') = 'object' then
    update levelmeup.profiles set
      voice = p_change -> 'settings' ->> 'voice',
      boundary_minutes = (p_change -> 'settings' ->> 'boundaryMinutes')::int,
      minutes_per_day = (p_change -> 'settings' ->> 'minutesPerDay')::int,
      difficulty = p_change -> 'settings' ->> 'difficulty'
    where user_id = p_user;
  end if;

  -- M7c (decision 3): the pact's level. A raise is signed now; a lowering keeps the time it was signed; off forgets it.
  -- The table's check refuses an unknown level. (On the right of `set`, accountability_level is still the old level.)
  if jsonb_typeof(p_change -> 'pact') = 'object' then
    update levelmeup.profiles set
      accountability_enabled_at = case
        when (p_change -> 'pact' ->> 'level')::int = 0 then null
        when (p_change -> 'pact' ->> 'level')::int > accountability_level then now()
        else accountability_enabled_at end,
      accountability_level = (p_change -> 'pact' ->> 'level')::int
    where user_id = p_user;
  end if;

  -- M7c (decision 3): a lower pact eases today's consequence at once, and only eases it: off lifts it, level 1 breaks the
  -- Trial's seal and keeps the Shadow.
  if jsonb_typeof(p_change -> 'consequence') = 'object' then
    update levelmeup.checkins set consequence = p_change -> 'consequence' ->> 'kind'
    where id = (p_change -> 'consequence' ->> 'checkinId')::bigint and user_id = p_user and resolved_at is null
      and ((consequence = 'shadow' and (p_change -> 'consequence' ->> 'kind') is null)
        or (consequence = 'trial' and coalesce(p_change -> 'consequence' ->> 'kind', 'shadow') = 'shadow'));
    if not found then raise exception 'lmu:bad_change'; end if;
  end if;

  -- M7c (decision 7): the Trial's focus session, once, on its recovery day while it runs (the day the change names).
  if jsonb_typeof(p_change -> 'trial') = 'object' then
    update levelmeup.checkins set trial_done_at = now()
    where id = (p_change -> 'trial' ->> 'checkinId')::bigint and user_id = p_user and resolved_at is null
      and consequence = 'trial' and trial_done_at is null and recovery_day_id = d.id;
    if not found then raise exception 'lmu:bad_change'; end if;
  end if;

  -- M7c (decision 8): the private note on a check-in answered in the last 14 days; null clears it. The table's check
  -- refuses one over 500 characters.
  if jsonb_typeof(p_change -> 'note') = 'object' then
    update levelmeup.checkins set note = p_change -> 'note' ->> 'text'
    where id = (p_change -> 'note' ->> 'checkinId')::bigint and user_id = p_user and answered_at > now() - interval '14 days';
    if not found then raise exception 'lmu:checkin_gone'; end if;
  end if;

  insert into levelmeup.ladder_states (user_id, ladder_id, state, updated_at)
  select p_user, x.key, x.value, now() from jsonb_each(coalesce(p_change -> 'ladders', '{}')) x
  on conflict (user_id, ladder_id) do update set state = excluded.state, updated_at = excluded.updated_at;

  if p_change ->> 'classId' is not null then
    select class_changed_at into changed_at from levelmeup.profiles where user_id = p_user;
    if changed_at is not null and now() < changed_at + interval '14 days' then raise exception 'lmu:class_locked'; end if;
    update levelmeup.profiles set class_id = p_change ->> 'classId', class_changed_at = now() where user_id = p_user;
  end if;

  -- M6c: the training setup; the table's checks refuse unknown equipment, styles, plans and workouts a week. M15: the
  -- plan and its workouts a week stay as they are when a change leaves them out (an older phone); switching the weekly
  -- program on starts its run (the right-hand sides read the row as it was).
  if jsonb_typeof(p_change -> 'training') = 'object' then
    update levelmeup.profiles set
      equipment = array(select jsonb_array_elements_text(coalesce(p_change -> 'training' -> 'equipment', '[]'))),
      program_style = p_change -> 'training' ->> 'programStyle',
      training_plan = coalesce(p_change -> 'training' ->> 'trainingPlan', training_plan),
      program_days = coalesce((p_change -> 'training' ->> 'programDays')::smallint, program_days),
      program_since = case
        when coalesce(p_change -> 'training' ->> 'trainingPlan', training_plan) = 'weekly' and training_plan <> 'weekly' then now()
        else program_since end
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

revoke all on all functions in schema levelmeup from public, anon, authenticated;
grant execute on function levelmeup.adjust(uuid, uuid, int, text, jsonb, jsonb) to lmu_service;
