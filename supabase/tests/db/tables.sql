-- Player tables: row level security, read-only access, constraints and cascading deletes (migration 0002).
-- Runs inside a transaction that always rolls back; test players use ids 00000000-0000-4000-8000-…

-- A player with one row in every player table.
create function lmu_test.add_player(p_n int) returns uuid language plpgsql as $$
declare
  me uuid := lmu_test.uid(p_n);
  day bigint;
  instance bigint;
begin
  insert into auth.users (id, aud, role, is_anonymous) values (me, 'authenticated', 'authenticated', true);
  insert into levelmeup.profiles (user_id, name, voice, class_id, time_zone, minutes_per_day, difficulty, goals, reveal)
    values (me, 'Player ' || p_n, 'system', 'warrior', 'Asia/Manila', 25, 'steady', array['body'], '{}');
  insert into levelmeup.character_state (user_id, start_strength, start_vitality, start_wisdom, start_focus, start_discipline)
    values (me, 7, 5, 5, 5, 4);
  insert into levelmeup.ladder_states (user_id, ladder_id, state) values (me, 'walk', '{"rung": 0}');
  insert into levelmeup.quest_days (user_id, day_number, starts_at, ends_at, time_zone, budget, light, content_version)
    values (me, 1, now() - interval '1 hour', now() + interval '10 hours', 'Asia/Manila', 10, true, 1) returning id into day;
  insert into levelmeup.quest_instances (day_id, user_id, slot, template_id, stat, tier, minutes, completion, condition, xp, why)
    values (day, me, 'core', 'walk-0', 'vitality', 'standard', 10, 'timer', '{"kind": "minutes", "minutes": 10}', '{"vitality": 20}', '{"code": "light_day"}')
    returning id into instance;
  insert into levelmeup.xp_ledger (user_id, source_type, source_id, stat, amount, instance_id) values (me, 'quest', gen_random_uuid()::text, 'vitality', 20, instance);
  insert into levelmeup.events (user_id, client_event_id, type, payload, result) values (me, gen_random_uuid(), 'complete', '{}', '{}');
  insert into levelmeup.checkins (user_id, gap_from, gap_to) values (me, 2, 3);
  insert into levelmeup.achievements_earned (user_id, achievement_id) values (me, 'first-quest');
  insert into levelmeup.ai_generations (user_id, kind, model, status) values (me, 'onboarding', 'claude-opus-5-5', 'fallback');
  return me;
end $$;

create function lmu_test.player_tables() returns setof text language sql as $$
  select unnest(array['profiles', 'character_state', 'ladder_states', 'quest_days', 'quest_instances', 'xp_ledger',
    'events', 'checkins', 'achievements_earned'])
$$;

create function lmu_test.test_rls_everywhere() returns setof text language plpgsql as $$
declare
  t record;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'levelmeup' and c.relkind = 'r' order by 1
  loop
    return next ok((select relrowsecurity from pg_class where oid = format('levelmeup.%I', t.relname)::regclass),
      format('RLS is on for levelmeup.%s', t.relname));
  end loop;
end $$;

create function lmu_test.test_players_read_only_their_own_rows() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.add_player(1);
  b uuid := lmu_test.add_player(2);
  t text;
begin
  for t in select lmu_test.player_tables() loop
    return next is(lmu_test.count_as(a, format('select 1 from levelmeup.%I where user_id = %L', t, a)), 1::bigint,
      format('a player reads their own %s', t));
    return next is(lmu_test.count_as(a, format('select 1 from levelmeup.%I where user_id = %L', t, b)), 0::bigint,
      format('a player cannot read another player''s %s', t));
  end loop;
end $$;

create function lmu_test.test_nobody_writes_directly() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.add_player(1);
  t text;
  p text;
begin
  for t in select lmu_test.player_tables() union all select 'ai_generations' union all select 'schema_migrations' loop
    foreach p in array array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'] loop
      return next ok(not has_table_privilege('lmu_player', format('levelmeup.%I', t), p), format('players have no %s on %s', p, t));
      return next ok(not has_table_privilege('lmu_service', format('levelmeup.%I', t), p), format('lmu_service has no %s on %s', p, t));
      return next ok(not has_table_privilege('authenticated', format('levelmeup.%I', t), p), format('the project''s users have no %s on %s', p, t));
    end loop;
  end loop;
  return next matches(lmu_test.try_as(a, 'update levelmeup.character_state set xp_strength = 999'), '^42501',
    'a player cannot award themselves XP');
  return next matches(lmu_test.try_as(a, format('insert into levelmeup.xp_ledger (user_id, source_type, source_id, stat, amount) values (%L, ''quest'', ''x'', ''strength'', 500)', a)),
    '^42501', 'a player cannot write the XP ledger');
  return next matches(lmu_test.try_as(a, 'delete from levelmeup.checkins'), '^42501', 'a player cannot delete a check-in');
end $$;

create function lmu_test.test_server_only_tables() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.add_player(1);
begin
  return next matches(lmu_test.try_as(a, 'select * from levelmeup.ai_generations'), '^42501', 'players cannot read AI usage');
  return next matches(lmu_test.try_as(a, 'select * from levelmeup.schema_migrations'), '^42501', 'players cannot read the migration list');
  return next matches(lmu_test.try_role('anon', 'select * from levelmeup.profiles'), '^42501', 'anon is refused');
  return next matches(lmu_test.try_role('authenticated', 'select * from levelmeup.profiles'), '^42501', 'the project''s signed-in users are refused');
  return next ok(not has_table_privilege('lmu_service', 'levelmeup.profiles', 'SELECT'), 'lmu_service reads only as a player');
end $$;

create function lmu_test.test_constraints() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.add_player(1);
  b uuid := lmu_test.add_player(2);
  b_day bigint := (select id from levelmeup.quest_days where user_id = b);
begin
  return next throws_ok(format('update levelmeup.profiles set voice = %L where user_id = %L', 'pirate', a), '23514', null, 'unknown voice');
  return next throws_ok(format('update levelmeup.profiles set goals = array[''body'',''focus'',''learn''] where user_id = %L', a), '23514', null, 'three goals');
  return next throws_ok(format('update levelmeup.profiles set goals = array[''body'',''body''] where user_id = %L', a), '23514', null, 'a goal twice');
  return next throws_ok(format('update levelmeup.profiles set minutes_per_day = 30 where user_id = %L', a), '23514', null, '30 minutes is not an option');
  return next throws_ok(format('update levelmeup.profiles set equipment = array[''kettlebell''] where user_id = %L', a), '23514', null, 'unknown equipment');
  return next throws_ok(format('update levelmeup.profiles set program_style = %L where user_id = %L', 'unisex', a), '23514', null, 'unknown program style');
  return next throws_ok(format('update levelmeup.profiles set equipment = array[''gym'', ''gym''] where user_id = %L', a), '23514', null, 'repeated equipment');
  return next throws_ok(format('update levelmeup.profiles set books_finished = %L where user_id = %L', '{"title": "x"}', a),
    '23514', null, 'finished books are a list'); -- M6d
  return next throws_ok(format('update levelmeup.profiles set name = %L where user_id = %L', '   ', a), '23514', null, 'a blank name');
  return next throws_ok(format('update levelmeup.character_state set xp_strength = -1 where user_id = %L', a), '23514', null, 'negative XP');
  return next throws_ok(format('update levelmeup.character_state set start_focus = 11 where user_id = %L', a), '23514', null, 'start points above 10');
  return next throws_ok(format('update levelmeup.quest_days set ends_at = starts_at where user_id = %L', a), '23514', null, 'a day must end after it starts');
  return next throws_ok(format('update levelmeup.quest_days set status = %L where user_id = %L', 'closed', a), '23514', null, 'a closed day needs a resolution');
  return next throws_ok(
    format('insert into levelmeup.quest_days (user_id, day_number, starts_at, ends_at, time_zone, budget, light, content_version) values (%L, 1, now(), now() + interval ''1 day'', ''UTC'', 25, false, 1)', a),
    '23505', null, 'one row per quest day');
  return next throws_ok(
    format('insert into levelmeup.quest_instances (day_id, user_id, slot, template_id, stat, tier, minutes, completion, condition, xp, why) values (%s, %L, ''side1'', ''x'', ''focus'', ''minor'', 2, ''tap'', ''{}'', ''{"focus": 10}'', ''{}'')', b_day, a),
    '23503', null, 'a quest belongs to a day of the same player');
  return next throws_ok(format('insert into levelmeup.checkins (user_id, day_id, gap_from, gap_to) values (%L, null, null, null)', a), '23514', null, 'a check-in is for a day or a gap');
  return next throws_ok(format('update levelmeup.quest_instances set rating = %L where user_id = %L', 'easy', a), '23514', null, 'only a completed quest has a rating');
  update levelmeup.character_state set xp_strength = 12, xp_discipline = 5 where user_id = a;
  return next is((select total_xp from levelmeup.character_state where user_id = a), 17, 'total XP is the sum of the stats');
end $$;

create function lmu_test.test_deleting_the_user_removes_everything() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.add_player(1);
  b uuid := lmu_test.add_player(2);
  t text;
  n bigint;
  -- The live project keeps the Claude usage of every deleted player (live tests delete theirs), so count only this one's.
  orphans bigint := (select count(*) from levelmeup.ai_generations where user_id is null);
begin
  delete from auth.users where id = a;
  for t in select lmu_test.player_tables() loop
    execute format('select count(*) from levelmeup.%I where user_id = %L', t, a) into n;
    return next is(n, 0::bigint, format('%s rows of the deleted player are gone', t));
    execute format('select count(*) from levelmeup.%I where user_id = %L', t, b) into n;
    return next is(n, 1::bigint, format('%s rows of other players stay', t));
  end loop;
  return next is((select count(*) from levelmeup.ai_generations where user_id is null) - orphans, 1::bigint, 'AI usage stays for cost tracking, without the player');
end $$;
