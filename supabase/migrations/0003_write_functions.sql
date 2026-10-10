-- The only way LevelMeUp's data changes (architecture §4.2). Each function runs as its owner (postgres), takes the
-- player id from lmu_service (which took it from the verified JWT), locks the player's character row first so a
-- player's writes happen one at a time, re-checks every guard, and raises 'lmu:<code>' when one fails.
-- Executable only by lmu_service.

-- An XP snapshot: whole positive amounts for known stats.
create function levelmeup.valid_xp(p jsonb) returns boolean language sql immutable set search_path = levelmeup, pg_temp as $$
  select jsonb_typeof(p) = 'object'
    and exists (select 1 from jsonb_each(p))
    and not exists (
      select 1 from jsonb_each(p) e
      where e.key not in ('strength', 'vitality', 'wisdom', 'focus', 'discipline')
        or jsonb_typeof(e.value) <> 'number'
        or (e.value)::numeric <> trunc((e.value)::numeric)
        or (e.value)::numeric not between 1 and 200
    )
$$;
alter table levelmeup.quest_instances add constraint quest_instances_xp_valid check (levelmeup.valid_xp(xp));

-- Locks the player's character row (every write starts here) and returns its version.
create function levelmeup.lock_player(p_user uuid) returns int language plpgsql set search_path = levelmeup, pg_temp as $$
declare
  v int;
begin
  select version into v from levelmeup.character_state where user_id = p_user for update;
  if not found then raise exception 'lmu:not_started'; end if;
  return v;
end $$;

-- Adds (p_sign = 1) or removes (p_sign = -1) an XP snapshot from the character, and bumps the version.
create function levelmeup.add_xp(p_user uuid, p_xp jsonb, p_sign int) returns void language sql set search_path = levelmeup, pg_temp as $$
  update levelmeup.character_state set
    xp_strength = xp_strength + p_sign * coalesce((p_xp ->> 'strength')::int, 0),
    xp_vitality = xp_vitality + p_sign * coalesce((p_xp ->> 'vitality')::int, 0),
    xp_wisdom = xp_wisdom + p_sign * coalesce((p_xp ->> 'wisdom')::int, 0),
    xp_focus = xp_focus + p_sign * coalesce((p_xp ->> 'focus')::int, 0),
    xp_discipline = xp_discipline + p_sign * coalesce((p_xp ->> 'discipline')::int, 0)
  where user_id = p_user
$$;

create function levelmeup.bump(p_user uuid) returns int language sql set search_path = levelmeup, pg_temp as $$
  update levelmeup.character_state set version = version + 1, updated_at = now() where user_id = p_user returning version
$$;

-- Inserts a quest day and its quests from the server's day draft (camelCase keys from _shared/advance.ts).
create function levelmeup.insert_day(p_user uuid, p_day jsonb) returns bigint language plpgsql set search_path = levelmeup, pg_temp as $$
declare
  day bigint;
begin
  insert into levelmeup.quest_days (user_id, day_number, starts_at, ends_at, time_zone, budget, light, comeback, hard_day, article_id, protection, content_version)
  select p_user, d."dayNumber", d."startsAt", d."endsAt", d."timeZone", d.budget, d.light, coalesce(d.comeback, false), false, d."articleId", d.protection, d."contentVersion"
  from jsonb_to_record(p_day) as d("dayNumber" int, "startsAt" timestamptz, "endsAt" timestamptz, "timeZone" text, budget smallint,
    light boolean, comeback boolean, "articleId" text, protection text, "contentVersion" int)
  returning id into day;

  insert into levelmeup.quest_instances (day_id, user_id, slot, template_id, ladder_id, rung, stat, tier, minutes, completion, condition, hard_day, xp, why, book)
  select day, p_user, q.slot, q."templateId", q.ladder, q.rung, q.stat, q.tier, q.minutes, q.completion, q.condition, coalesce(q."hardDay", false), q.xp, q.why, q.book
  from jsonb_to_recordset(coalesce(p_day -> 'quests', '[]')) as q(slot text, "templateId" text, ladder text, rung smallint, stat text, tier text,
    minutes smallint, completion text, condition jsonb, "hardDay" boolean, xp jsonb, why jsonb, book text);
  return day;
end $$;

-- Onboarding: the profile, the character, the starting ladders and day 1, once.
create function levelmeup.start_player(p_user uuid, p_profile jsonb, p_character jsonb, p_ladders jsonb, p_day jsonb)
returns jsonb language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  day bigint;
begin
  if exists (select 1 from levelmeup.profiles where user_id = p_user) then raise exception 'lmu:already_started'; end if;
  if (p_day ->> 'dayNumber')::int <> 1 then raise exception 'lmu:out_of_order'; end if;

  insert into levelmeup.profiles (user_id, name, voice, class_id, time_zone, boundary_minutes, minutes_per_day, difficulty, goals,
    limitations, gentle_start, own_program, reveal)
  select p_user, btrim(p.name), p.voice, p."classId", p."timeZone", p."boundaryMinutes", p."minutesPerDay", p.difficulty, p.goals,
    coalesce(p.limitations, '{}'), p."gentleStart", p."ownProgram", p.reveal
  from jsonb_to_record(p_profile) as p(name text, voice text, "classId" text, "timeZone" text, "boundaryMinutes" int, "minutesPerDay" int,
    difficulty text, goals text[], limitations text[], "gentleStart" boolean, "ownProgram" boolean, reveal jsonb);

  insert into levelmeup.character_state (user_id, start_strength, start_vitality, start_wisdom, start_focus, start_discipline, version)
  select p_user, c.strength, c.vitality, c.wisdom, c.focus, c.discipline, 1
  from jsonb_to_record(p_character) as c(strength smallint, vitality smallint, wisdom smallint, focus smallint, discipline smallint);

  insert into levelmeup.ladder_states (user_id, ladder_id, state)
  select p_user, l.key, l.value from jsonb_each(coalesce(p_ladders, '{}')) l;

  day := levelmeup.insert_day(p_user, p_day);
  return jsonb_build_object('dayId', day, 'version', 1);
end $$;

-- The 3-call cap on onboarding Claude calls (and later article budgets), counted under a lock.
create function levelmeup.reserve_ai_call(p_user uuid, p_kind text, p_model text, p_cap int)
returns bigint language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  new_id bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(coalesce(p_user::text, '') || ':' || p_kind, 0));
  if (select count(*) from levelmeup.ai_generations where user_id is not distinct from p_user and kind = p_kind) >= p_cap then
    raise exception 'lmu:ai_cap';
  end if;
  insert into levelmeup.ai_generations (user_id, kind, model, status) values (p_user, p_kind, p_model, 'pending') returning ai_generations.id into new_id;
  return new_id;
end $$;

create function levelmeup.finish_ai_call(p_id bigint, p_status text, p_input_tokens int, p_output_tokens int, p_cost_usd numeric, p_error text)
returns void language sql security definer set search_path = levelmeup, pg_temp as $$
  update levelmeup.ai_generations
  set status = p_status, input_tokens = p_input_tokens, output_tokens = p_output_tokens, cost_usd = p_cost_usd,
      error = left(p_error, 1000), finished_at = now()
  where id = p_id and status = 'pending'
$$;

-- Spec §3.6: once per quest, inside the day (5 minutes of clock skew), up to 48 hours late, while the day is open.
create function levelmeup.complete_quest(p_user uuid, p_event uuid, p_instance bigint, p_completed_at timestamptz, p_rating text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  stored jsonb;
  q levelmeup.quest_instances;
  d levelmeup.quest_days;
  v int;
  total int;
  outcome jsonb;
begin
  perform levelmeup.lock_player(p_user);
  select e.result into stored from levelmeup.events e where e.user_id = p_user and e.client_event_id = p_event;
  if found then return stored; end if;

  select * into q from levelmeup.quest_instances where id = p_instance and user_id = p_user;
  if not found then raise exception 'lmu:not_found'; end if;
  select * into d from levelmeup.quest_days where id = q.day_id;
  if q.completed_at is not null then raise exception 'lmu:already_completed'; end if;
  if d.status <> 'open' then raise exception 'lmu:day_closed'; end if;
  if p_completed_at < d.starts_at or p_completed_at >= d.ends_at then raise exception 'lmu:outside_day'; end if;
  if p_completed_at > now() + interval '5 minutes' then raise exception 'lmu:future'; end if;
  if now() > d.ends_at + interval '48 hours' then raise exception 'lmu:too_late'; end if;
  if p_rating is not null and p_rating not in ('easy', 'right', 'too_hard') then raise exception 'lmu:bad_rating'; end if;

  update levelmeup.quest_instances
  set completed_at = p_completed_at, completion_event = p_event, rating = p_rating, payload = p_payload
  where id = q.id;
  insert into levelmeup.xp_ledger (user_id, source_type, source_id, stat, amount, instance_id)
  select p_user, 'quest', p_event::text, x.key, x.value::int, q.id from jsonb_each_text(q.xp) x;
  perform levelmeup.add_xp(p_user, q.xp, 1);
  update levelmeup.character_state set quests_cleared = quests_cleared + 1 where user_id = p_user;
  v := levelmeup.bump(p_user);
  select total_xp into total from levelmeup.character_state where user_id = p_user;

  outcome := jsonb_build_object('instanceId', q.id, 'xp', q.xp, 'totalXp', total, 'version', v);
  insert into levelmeup.events (user_id, client_event_id, type, payload, result)
  values (p_user, p_event, 'complete',
    jsonb_build_object('instanceId', q.id, 'completedAt', p_completed_at, 'rating', p_rating, 'payload', p_payload), outcome);
  return outcome;
end $$;

-- A same-day mis-tap: reverses that exact award. Only while the day is still running.
create function levelmeup.undo_quest(p_user uuid, p_event uuid, p_instance bigint)
returns jsonb language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  stored jsonb;
  q levelmeup.quest_instances;
  d levelmeup.quest_days;
  v int;
  total int;
  outcome jsonb;
begin
  perform levelmeup.lock_player(p_user);
  select e.result into stored from levelmeup.events e where e.user_id = p_user and e.client_event_id = p_event;
  if found then return stored; end if;

  select * into q from levelmeup.quest_instances where id = p_instance and user_id = p_user;
  if not found then raise exception 'lmu:not_found'; end if;
  select * into d from levelmeup.quest_days where id = q.day_id;
  if q.completed_at is null then raise exception 'lmu:not_completed'; end if;
  if d.status <> 'open' or now() >= d.ends_at then raise exception 'lmu:day_closed'; end if;

  insert into levelmeup.xp_ledger (user_id, source_type, source_id, stat, amount, instance_id)
  select p_user, 'undo', p_event::text, x.key, -(x.value::int), q.id from jsonb_each_text(q.xp) x;
  perform levelmeup.add_xp(p_user, q.xp, -1);
  update levelmeup.quest_instances set completed_at = null, completion_event = null, rating = null, payload = null where id = q.id;
  update levelmeup.character_state set quests_cleared = quests_cleared - 1 where user_id = p_user;
  v := levelmeup.bump(p_user);
  select total_xp into total from levelmeup.character_state where user_id = p_user;

  outcome := jsonb_build_object('instanceId', q.id, 'totalXp', total, 'version', v);
  insert into levelmeup.events (user_id, client_event_id, type, payload, result)
  values (p_user, p_event, 'undo', jsonb_build_object('instanceId', q.id), outcome);
  return outcome;
end $$;

-- "How did it feel?" Read when the day closes, so it never moves a ladder on its own.
create function levelmeup.rate_quest(p_user uuid, p_event uuid, p_instance bigint, p_rating text)
returns jsonb language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  stored jsonb;
  q levelmeup.quest_instances;
  d levelmeup.quest_days;
  v int;
  outcome jsonb;
begin
  perform levelmeup.lock_player(p_user);
  select e.result into stored from levelmeup.events e where e.user_id = p_user and e.client_event_id = p_event;
  if found then return stored; end if;

  select * into q from levelmeup.quest_instances where id = p_instance and user_id = p_user;
  if not found then raise exception 'lmu:not_found'; end if;
  select * into d from levelmeup.quest_days where id = q.day_id;
  if p_rating is null or p_rating not in ('easy', 'right', 'too_hard') then raise exception 'lmu:bad_rating'; end if;
  if q.completed_at is null then raise exception 'lmu:not_completed'; end if;
  if d.status <> 'open' then raise exception 'lmu:day_closed'; end if;

  update levelmeup.quest_instances set rating = p_rating where id = q.id;
  v := levelmeup.bump(p_user);
  outcome := jsonb_build_object('instanceId', q.id, 'rating', p_rating, 'version', v);
  insert into levelmeup.events (user_id, client_event_id, type, payload, result)
  values (p_user, p_event, 'rate', jsonb_build_object('instanceId', q.id, 'rating', p_rating), outcome);
  return outcome;
end $$;

-- Lazy day closing and the next day (architecture §4.3), computed by _shared/advance.ts from the state it read at
-- p_version. Fails with lmu:conflict if anything was written since, so the caller re-reads and recomputes.
create function levelmeup.advance(p_user uuid, p_version int, p_outcome jsonb)
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
    comebacks = comebacks + coalesce((p_outcome -> 'counters' ->> 'comebacks')::int, 0)
  where user_id = p_user;

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

-- Earned achievements (rules: newAchievements). Earning one twice changes nothing.
create function levelmeup.award_achievements(p_user uuid, p_ids text[])
returns int language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  n int;
begin
  perform levelmeup.lock_player(p_user);
  insert into levelmeup.achievements_earned (user_id, achievement_id)
  select p_user, a from unnest(p_ids) a
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- Account deletion: every LevelMeUp row of the player. AI usage stays for cost tracking, without the player.
create function levelmeup.delete_player(p_user uuid)
returns jsonb language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  counts jsonb := '{}';
  n int;
begin
  delete from levelmeup.achievements_earned where user_id = p_user; get diagnostics n = row_count; counts := counts || jsonb_build_object('achievements', n);
  delete from levelmeup.checkins where user_id = p_user; get diagnostics n = row_count; counts := counts || jsonb_build_object('checkins', n);
  delete from levelmeup.events where user_id = p_user; get diagnostics n = row_count; counts := counts || jsonb_build_object('events', n);
  delete from levelmeup.xp_ledger where user_id = p_user; get diagnostics n = row_count; counts := counts || jsonb_build_object('ledger', n);
  delete from levelmeup.quest_instances where user_id = p_user; get diagnostics n = row_count; counts := counts || jsonb_build_object('quests', n);
  delete from levelmeup.quest_days where user_id = p_user; get diagnostics n = row_count; counts := counts || jsonb_build_object('days', n);
  delete from levelmeup.ladder_states where user_id = p_user; get diagnostics n = row_count; counts := counts || jsonb_build_object('ladders', n);
  delete from levelmeup.character_state where user_id = p_user; get diagnostics n = row_count; counts := counts || jsonb_build_object('character', n);
  delete from levelmeup.profiles where user_id = p_user; get diagnostics n = row_count; counts := counts || jsonb_build_object('profile', n);
  update levelmeup.ai_generations set user_id = null where user_id = p_user;
  return counts;
end $$;

revoke all on all functions in schema levelmeup from public, anon, authenticated;
grant execute on function
  levelmeup.start_player(uuid, jsonb, jsonb, jsonb, jsonb),
  levelmeup.reserve_ai_call(uuid, text, text, int),
  levelmeup.finish_ai_call(bigint, text, int, int, numeric, text),
  levelmeup.complete_quest(uuid, uuid, bigint, timestamptz, text, jsonb),
  levelmeup.undo_quest(uuid, uuid, bigint),
  levelmeup.rate_quest(uuid, uuid, bigint, text),
  levelmeup.advance(uuid, int, jsonb),
  levelmeup.award_achievements(uuid, text[]),
  levelmeup.delete_player(uuid)
  to lmu_service;
