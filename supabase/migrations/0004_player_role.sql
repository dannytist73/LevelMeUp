-- Code review fixes (M3). Applied by `npm run db:deploy`.
--
-- 1. Player reads use LevelMeUp's own role. lmu_service could switch to `authenticated` with any claims, which is
--    every user of the shared project, wedding admins included (the wedding's policies trust auth.uid() and the
--    JWT). lmu_player can read LevelMeUp's tables and nothing else, whatever claims it carries.
-- 2. delete_player takes the player's lock, so a sync can't add rows while an account is being deleted.
-- 3. A client_event_id reused for a different action or quest is refused instead of returning the other result.

create role lmu_player nologin noinherit;

-- The player whose claims lmu_service set for this transaction (db.ts asPlayer).
create function levelmeup.player_id() returns uuid language sql stable set search_path = levelmeup, pg_temp as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;

drop policy "players read their own profile" on levelmeup.profiles;
drop policy "players read their own character" on levelmeup.character_state;
drop policy "players read their own ladders" on levelmeup.ladder_states;
drop policy "players read their own days" on levelmeup.quest_days;
drop policy "players read their own quests" on levelmeup.quest_instances;
drop policy "players read their own XP" on levelmeup.xp_ledger;
drop policy "players read their own events" on levelmeup.events;
drop policy "players read their own check-ins" on levelmeup.checkins;
drop policy "players read their own achievements" on levelmeup.achievements_earned;

create policy "players read their own profile" on levelmeup.profiles for select to lmu_player using (user_id = (select levelmeup.player_id()));
create policy "players read their own character" on levelmeup.character_state for select to lmu_player using (user_id = (select levelmeup.player_id()));
create policy "players read their own ladders" on levelmeup.ladder_states for select to lmu_player using (user_id = (select levelmeup.player_id()));
create policy "players read their own days" on levelmeup.quest_days for select to lmu_player using (user_id = (select levelmeup.player_id()));
create policy "players read their own quests" on levelmeup.quest_instances for select to lmu_player using (user_id = (select levelmeup.player_id()));
create policy "players read their own XP" on levelmeup.xp_ledger for select to lmu_player using (user_id = (select levelmeup.player_id()));
create policy "players read their own events" on levelmeup.events for select to lmu_player using (user_id = (select levelmeup.player_id()));
create policy "players read their own check-ins" on levelmeup.checkins for select to lmu_player using (user_id = (select levelmeup.player_id()));
create policy "players read their own achievements" on levelmeup.achievements_earned for select to lmu_player using (user_id = (select levelmeup.player_id()));

revoke select on levelmeup.profiles, levelmeup.character_state, levelmeup.ladder_states, levelmeup.quest_days,
  levelmeup.quest_instances, levelmeup.xp_ledger, levelmeup.events, levelmeup.checkins, levelmeup.achievements_earned
  from authenticated;
revoke usage on schema levelmeup from authenticated;
revoke authenticated from lmu_service;

grant usage on schema levelmeup to lmu_player;
grant select on levelmeup.profiles, levelmeup.character_state, levelmeup.ladder_states, levelmeup.quest_days,
  levelmeup.quest_instances, levelmeup.xp_ledger, levelmeup.events, levelmeup.checkins, levelmeup.achievements_earned
  to lmu_player;
grant execute on function levelmeup.player_id() to lmu_player;
grant lmu_player to lmu_service with inherit false, set true;

-- The stored result of an applied event, or null. The same id for another action or quest is refused.
create function levelmeup.stored_event(p_user uuid, p_event uuid, p_type text, p_instance bigint)
returns jsonb language plpgsql stable set search_path = levelmeup, pg_temp as $$
declare
  e levelmeup.events;
begin
  select * into e from levelmeup.events where user_id = p_user and client_event_id = p_event;
  if not found then return null; end if;
  if e.type <> p_type or (e.payload ->> 'instanceId')::bigint is distinct from p_instance then raise exception 'lmu:event_reused'; end if;
  return e.result;
end $$;

create or replace function levelmeup.delete_player(p_user uuid)
returns jsonb language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  counts jsonb := '{}';
  n int;
begin
  -- Wait for any write in flight, so nothing is added after the deletes below.
  perform 1 from levelmeup.character_state where user_id = p_user for update;
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

-- Spec §3.6: once per quest, inside the day (5 minutes of clock skew), up to 48 hours late, while the day is open.
create or replace function levelmeup.complete_quest(p_user uuid, p_event uuid, p_instance bigint, p_completed_at timestamptz, p_rating text, p_payload jsonb)
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
  stored := levelmeup.stored_event(p_user, p_event, 'complete', p_instance);
  if stored is not null then return stored; end if;

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
create or replace function levelmeup.undo_quest(p_user uuid, p_event uuid, p_instance bigint)
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
  stored := levelmeup.stored_event(p_user, p_event, 'undo', p_instance);
  if stored is not null then return stored; end if;

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
create or replace function levelmeup.rate_quest(p_user uuid, p_event uuid, p_instance bigint, p_rating text)
returns jsonb language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  stored jsonb;
  q levelmeup.quest_instances;
  d levelmeup.quest_days;
  v int;
  outcome jsonb;
begin
  perform levelmeup.lock_player(p_user);
  stored := levelmeup.stored_event(p_user, p_event, 'rate', p_instance);
  if stored is not null then return stored; end if;

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
