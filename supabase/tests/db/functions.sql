-- The write functions (migration 0003): each guard, once-only rewards, undo, closing days, deletion, permissions.
-- Runs inside a transaction that always rolls back, after _helpers.sql.

create function lmu_test.test_start_player() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
begin
  return next is((select class_id from levelmeup.profiles where user_id = a), 'warrior', 'the profile is stored');
  return next is((select start_strength from levelmeup.character_state where user_id = a), 9::smallint, 'start points are stored');
  return next is(lmu_test.version(a), 1, 'a new character is at version 1');
  return next is((select count(*) from levelmeup.ladder_states where user_id = a), 1::bigint, 'the starting ladders are stored');
  return next is((select day_number from levelmeup.quest_days where user_id = a), 1, 'day 1 exists');
  return next is((select count(*) from levelmeup.quest_instances where user_id = a), 3::bigint, 'day 1 has its quests');
  return next is((select xp from levelmeup.quest_instances where id = lmu_test.quest(a, 'core')), '{"vitality": 20}'::jsonb, 'quests keep their XP snapshot');
  return next throws_ok(format($q$ select levelmeup.start_player(%L, '{}', '{}', '{}', '{"dayNumber": 1}') $q$, a), 'P0001', 'lmu:already_started', 'onboarding happens once');
end $$;

create function lmu_test.test_start_player_rejects_bad_data() returns setof text language plpgsql as $$
declare
  me uuid := lmu_test.uid(9);
begin
  insert into auth.users (id, aud, role, is_anonymous) values (me, 'authenticated', 'authenticated', true);
  return next throws_ok(format($q$ select levelmeup.start_player(%L, '{}', '{}', '{}', lmu_test.day(2, now(), now() + interval '1 day')) $q$, me),
    'P0001', 'lmu:out_of_order', 'onboarding starts on day 1');
  return next throws_ok(format($q$
    select levelmeup.start_player(%L,
      '{"name": "X", "voice": "system", "classId": "warrior", "timeZone": "UTC", "boundaryMinutes": 240, "minutesPerDay": 25,
        "difficulty": "steady", "goals": ["body"], "gentleStart": false, "ownProgram": false, "reveal": {}}',
      '{"strength": 9, "vitality": 5, "wisdom": 5, "focus": 5, "discipline": 4}', '{}',
      jsonb_set(lmu_test.day(1, now(), now() + interval '1 day'), '{quests,0,xp}', '{"vitality": 5000}')) $q$, me),
    '23514', null, 'an XP snapshot over 200 is refused');
end $$;

create function lmu_test.test_complete_rewards_once() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  core bigint := lmu_test.quest(a, 'core');
  first jsonb;
  again jsonb;
begin
  first := levelmeup.complete_quest(a, lmu_test.ev(1), core, now(), 'right', '{"segments": []}');
  return next is(first ->> 'totalXp', '20', 'the snapshot XP is awarded');
  return next is((select xp_vitality from levelmeup.character_state where user_id = a), 20, 'to the quest''s stat');
  return next is((select quests_cleared from levelmeup.character_state where user_id = a), 1, 'quests cleared counts it');
  return next is(lmu_test.version(a), 2, 'the version rises');
  again := levelmeup.complete_quest(a, lmu_test.ev(1), core, now(), 'right', '{}');
  return next is(again, first, 'the same event returns the same result');
  return next is((select count(*) from levelmeup.xp_ledger where user_id = a), 1::bigint, 'and writes nothing more');
  return next is(lmu_test.version(a), 2, 'and changes nothing');
  return next throws_ok(format('select levelmeup.complete_quest(%L, %L, %s, now(), null, null)', a, lmu_test.ev(2), core),
    'P0001', 'lmu:already_completed', 'a second event for the same quest is refused');
  perform levelmeup.complete_quest(a, lmu_test.ev(3), lmu_test.quest(a, 'side2'), now(), null, null);
  return next is((select xp_focus || '/' || xp_vitality from levelmeup.character_state where user_id = a), '6/24', 'a split snapshot pays each stat');
  return next is((select count(*) from levelmeup.events where user_id = a), 2::bigint, 'each applied event is stored once');
end $$;

create function lmu_test.test_complete_guards() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  b uuid := lmu_test.start(2);
  late uuid := lmu_test.start(3, now() - interval '60 hours', now() - interval '49 hours');
  core bigint := lmu_test.quest(a, 'core');
  starts timestamptz := (select starts_at from levelmeup.quest_days where user_id = a);
  ends timestamptz := (select ends_at from levelmeup.quest_days where user_id = a);
begin
  return next throws_ok(format('select levelmeup.complete_quest(%L, %L, %s, now(), null, null)', b, lmu_test.ev(1), core),
    'P0001', 'lmu:not_found', 'another player''s quest is not found');
  return next throws_ok(format('select levelmeup.complete_quest(%L, %L, %s, %L, null, null)', a, lmu_test.ev(1), core, starts - interval '1 second'),
    'P0001', 'lmu:outside_day', 'a completion stamped before the day');
  return next throws_ok(format('select levelmeup.complete_quest(%L, %L, %s, %L, null, null)', a, lmu_test.ev(1), core, ends),
    'P0001', 'lmu:outside_day', 'a completion stamped when the day has ended');
  return next throws_ok(format('select levelmeup.complete_quest(%L, %L, %s, %L, null, null)', a, lmu_test.ev(1), core, now() + interval '10 minutes'),
    'P0001', 'lmu:future', 'a completion stamped in the future');
  return next lives_ok(format('select levelmeup.complete_quest(%L, %L, %s, %L, null, null)', a, lmu_test.ev(2), lmu_test.quest(a, 'side1'), now() + interval '4 minutes'),
    'up to 5 minutes of clock skew is fine');
  return next throws_ok(format('select levelmeup.complete_quest(%L, %L, %s, %L, null, null)', late, lmu_test.ev(1), lmu_test.quest(late, 'core'), now() - interval '55 hours'),
    'P0001', 'lmu:too_late', 'more than 48 hours after the day ended');
  return next throws_ok(format('select levelmeup.complete_quest(%L, %L, %s, now(), %L, null)', a, lmu_test.ev(1), core, 'meh'),
    'P0001', 'lmu:bad_rating', 'an unknown rating');
  update levelmeup.quest_days set status = 'closed', resolution = 'protected', closed_at = now() where user_id = a;
  return next throws_ok(format('select levelmeup.complete_quest(%L, %L, %s, now(), null, null)', a, lmu_test.ev(1), core),
    'P0001', 'lmu:day_closed', 'a closed day takes no completions');
  return next throws_ok(format('select levelmeup.complete_quest(%L, %L, 1, now(), null, null)', lmu_test.uid(99), lmu_test.ev(1)),
    'P0001', 'lmu:not_started', 'a player without a character');
end $$;

create function lmu_test.test_late_completion_within_48_hours() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1, now() - interval '30 hours', now() - interval '6 hours');
begin
  return next lives_ok(format('select levelmeup.complete_quest(%L, %L, %s, %L, null, null)', a, lmu_test.ev(1), lmu_test.quest(a, 'core'), now() - interval '20 hours'),
    'an offline completion inside the day counts until 48 hours after it ended');
end $$;

create function lmu_test.test_undo() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  core bigint := lmu_test.quest(a, 'core');
  undone jsonb;
begin
  return next throws_ok(format('select levelmeup.undo_quest(%L, %L, %s)', a, lmu_test.ev(1), core), 'P0001', 'lmu:not_completed', 'nothing to undo');
  perform levelmeup.complete_quest(a, lmu_test.ev(2), core, now(), 'easy', '{}');
  undone := levelmeup.undo_quest(a, lmu_test.ev(3), core);
  return next is(undone ->> 'totalXp', '0', 'undo takes the XP back');
  return next is((select quests_cleared from levelmeup.character_state where user_id = a), 0, 'and the cleared count');
  return next is((select sum(amount) from levelmeup.xp_ledger where user_id = a), 0::bigint, 'the ledger nets to zero');
  return next is((select count(*) from levelmeup.quest_instances where id = core and completed_at is null and rating is null and payload is null), 1::bigint,
    'the quest is open again, rating and payload cleared');
  return next is(levelmeup.undo_quest(a, lmu_test.ev(3), core), undone, 'the same undo event returns the same result');
  perform levelmeup.complete_quest(a, lmu_test.ev(4), core, now(), null, null);
  return next is((select total_xp from levelmeup.character_state where user_id = a), 20, 'it can be completed again');
  update levelmeup.quest_days set ends_at = now() - interval '1 second', starts_at = now() - interval '20 hours' where user_id = a;
  return next throws_ok(format('select levelmeup.undo_quest(%L, %L, %s)', a, lmu_test.ev(5), core), 'P0001', 'lmu:day_closed', 'no undo after the day ended');
end $$;

create function lmu_test.test_rate() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  core bigint := lmu_test.quest(a, 'core');
begin
  return next throws_ok(format('select levelmeup.rate_quest(%L, %L, %s, %L)', a, lmu_test.ev(1), core, 'easy'), 'P0001', 'lmu:not_completed', 'rate needs a completion');
  perform levelmeup.complete_quest(a, lmu_test.ev(2), core, now(), null, null);
  return next throws_ok(format('select levelmeup.rate_quest(%L, %L, %s, %L)', a, lmu_test.ev(3), core, 'meh'), 'P0001', 'lmu:bad_rating', 'an unknown rating');
  perform levelmeup.rate_quest(a, lmu_test.ev(4), core, 'too_hard');
  return next is((select rating from levelmeup.quest_instances where id = core), 'too_hard', 'the rating is stored');
  return next is((select count(*) from levelmeup.ladder_states where user_id = a and state ->> 'rung' <> '0'), 0::bigint, 'rating never moves a ladder by itself');
end $$;

create function lmu_test.close_day_one(p_user uuid, p_version int, p_day2_starts timestamptz) returns jsonb language sql as $$
  select levelmeup.advance(p_user, p_version, jsonb_build_object(
    'close', jsonb_build_array(jsonb_build_object('dayId', (select id from levelmeup.quest_days where user_id = p_user and day_number = 1),
      'resolution', 'streak_day', 'streakApplied', true, 'checkin', false)),
    'gap', null,
    'ladders', '{"walk": {"rung": 1, "highestRung": 1, "atRung": [], "misses": [], "lastStepUpAt": 0, "paused": false}}'::jsonb,
    'ledger', '[{"sourceType": "discipline", "sourceId": "day:1", "stat": "discipline", "amount": 5},
                {"sourceType": "rung", "sourceId": "rung:walk:1", "stat": "vitality", "amount": 15}]'::jsonb,
    'streak', '{"current": 1, "best": 1, "shields": 0, "awaitingCheckin": false}'::jsonb,
    'counters', '{"hardDaysCleared": 0, "comebacks": 0}'::jsonb,
    'newDay', lmu_test.day(2, p_day2_starts, p_day2_starts + interval '24 hours')))
$$;

create function lmu_test.test_advance_closes_and_builds() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1, now() - interval '30 hours', now() - interval '6 hours');
  day1_end timestamptz := (select ends_at from levelmeup.quest_days where user_id = a);
  result jsonb;
begin
  result := lmu_test.close_day_one(a, 1, day1_end);
  return next is(result ->> 'version', '2', 'advance bumps the version');
  return next is((select status || '/' || resolution from levelmeup.quest_days where user_id = a and day_number = 1), 'closed/streak_day', 'day 1 is closed');
  return next is((select count(*) from levelmeup.quest_instances q join levelmeup.quest_days d on d.id = q.day_id where d.user_id = a and d.day_number = 2), 3::bigint,
    'day 2 is built with its quests');
  return next is((select xp_discipline || '/' || xp_vitality from levelmeup.character_state where user_id = a), '5/15', 'Discipline and the rung bonus are paid');
  return next is((select streak_current from levelmeup.character_state where user_id = a), 1, 'the streak is stored');
  return next is((select state ->> 'rung' from levelmeup.ladder_states where user_id = a and ladder_id = 'walk'), '1', 'the ladder state is stored');
  -- A later advance carrying the same rung key can't pay it twice.
  perform levelmeup.advance(a, 2, '{"ledger": [{"sourceType": "rung", "sourceId": "rung:walk:1", "stat": "vitality", "amount": 15}]}');
  return next is((select xp_vitality from levelmeup.character_state where user_id = a), 15, 'a rung bonus is paid once ever');
end $$;

create function lmu_test.test_advance_guards() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1, now() - interval '30 hours', now() - interval '6 hours');
  b uuid := lmu_test.start(2);
  day1 bigint := (select id from levelmeup.quest_days where user_id = a);
  day1_end timestamptz := (select ends_at from levelmeup.quest_days where user_id = a);
begin
  return next throws_ok(format('select levelmeup.advance(%L, 7, %L)', a, '{}'), 'P0001', 'lmu:conflict', 'a stale version is refused');
  return next throws_ok(format('select levelmeup.advance(%L, 1, %L)', b,
    jsonb_build_object('close', jsonb_build_array(jsonb_build_object('dayId', (select id from levelmeup.quest_days where user_id = b), 'resolution', 'protected')))),
    'P0001', 'lmu:not_ended', 'a running day cannot be closed');
  return next throws_ok(format('select levelmeup.advance(%L, 1, %L)', b,
    jsonb_build_object('close', jsonb_build_array(jsonb_build_object('dayId', day1, 'resolution', 'protected')))),
    'P0001', 'lmu:not_found', 'another player''s day is not found');
  return next throws_ok(format('select levelmeup.advance(%L, 1, %L)', a, jsonb_build_object('newDay', lmu_test.day(2, day1_end, day1_end + interval '1 day'))),
    'P0001', 'lmu:out_of_order', 'no new day while one is open');
  return next throws_ok(format('select levelmeup.advance(%L, 1, %L)', a, '{"ledger": [{"sourceType": "quest", "sourceId": "x", "stat": "strength", "amount": 50}]}'),
    'P0001', 'lmu:bad_ledger', 'advance cannot pay quest XP');
  return next throws_ok(format('select levelmeup.advance(%L, 1, %L)', a, '{"ledger": [{"sourceType": "rung", "sourceId": "x", "stat": "strength", "amount": 500}]}'),
    'P0001', 'lmu:bad_ledger', 'advance cannot pay a huge bonus');
  perform lmu_test.close_day_one(a, 1, day1_end);
  return next throws_ok(format('select levelmeup.advance(%L, 2, %L)', a,
    jsonb_build_object('close', jsonb_build_array(jsonb_build_object('dayId', day1, 'resolution', 'protected')))),
    'P0001', 'lmu:not_open', 'a closed day stays closed');
  update levelmeup.quest_days set status = 'closed', resolution = 'protected', closed_at = now(), ends_at = now() - interval '1 minute',
    starts_at = now() - interval '1 day' where user_id = a and day_number = 2;
  return next throws_ok(format('select levelmeup.advance(%L, 2, %L)', a, jsonb_build_object('newDay', lmu_test.day(2, now(), now() + interval '1 day'))),
    'P0001', 'lmu:day_exists', 'a day number is never reused');
  return next throws_ok(format('select levelmeup.advance(%L, 2, %L)', a, jsonb_build_object('newDay', lmu_test.day(3, now() - interval '2 hours', now() + interval '1 day'))),
    'P0001', 'lmu:overlap', 'days never overlap');
end $$;

create function lmu_test.test_advance_records_checkins() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1, now() - interval '30 hours', now() - interval '6 hours');
begin
  perform levelmeup.advance(a, 1, jsonb_build_object(
    'close', jsonb_build_array(jsonb_build_object('dayId', (select id from levelmeup.quest_days where user_id = a), 'resolution', 'awaiting_checkin',
      'streakApplied', true, 'checkin', true)),
    'gap', '{"from": 2, "to": 4}'::jsonb,
    'streak', '{"current": 0, "best": 0, "shields": 0, "awaitingCheckin": true}'::jsonb));
  return next is((select count(*) from levelmeup.checkins where user_id = a and day_id is not null and answer is null), 1::bigint, 'a missed day asks its check-in');
  return next is((select gap_from || '-' || gap_to from levelmeup.checkins where user_id = a and day_id is null), '2-4', 'away days are one gap check-in');
  return next ok((select awaiting_checkin from levelmeup.character_state where user_id = a), 'the streak waits for the check-in');
end $$;

create function lmu_test.test_achievements_and_ai_cap() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  call_id bigint;
begin
  return next is(levelmeup.award_achievements(a, array['first-quest', 'first-quest', 'level-5']), 2, 'achievements are stored once');
  return next is(levelmeup.award_achievements(a, array['first-quest']), 0, 'earning one again changes nothing');
  call_id := levelmeup.reserve_ai_call(a, 'onboarding', 'claude-opus-5-5', 3);
  perform levelmeup.finish_ai_call(call_id, 'ok', 900, 400, 0.0123, null);
  return next is((select status || '/' || output_tokens from levelmeup.ai_generations where id = call_id), 'ok/400', 'a finished call records its usage');
  perform levelmeup.reserve_ai_call(a, 'onboarding', 'claude-opus-5-5', 3);
  perform levelmeup.reserve_ai_call(a, 'onboarding', 'claude-opus-5-5', 3);
  return next throws_ok(format('select levelmeup.reserve_ai_call(%L, %L, %L, 3)', a, 'onboarding', 'claude-opus-5-5'), 'P0001', 'lmu:ai_cap', 'the fourth onboarding call is refused');
end $$;

create function lmu_test.test_delete_player() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  b uuid := lmu_test.start(2);
  counts jsonb;
begin
  perform levelmeup.complete_quest(a, lmu_test.ev(1), lmu_test.quest(a, 'core'), now(), null, null);
  perform levelmeup.award_achievements(a, array['first-quest']);
  perform levelmeup.reserve_ai_call(a, 'onboarding', 'claude-opus-5-5', 3);
  counts := levelmeup.delete_player(a);
  return next is(counts ->> 'days', '1', 'the days are deleted');
  return next is(counts ->> 'quests', '3', 'the quests are deleted');
  return next is(counts ->> 'ledger', '1', 'the XP ledger is deleted');
  return next is((select count(*) from levelmeup.profiles where user_id = a) + (select count(*) from levelmeup.character_state where user_id = a)
    + (select count(*) from levelmeup.events where user_id = a) + (select count(*) from levelmeup.achievements_earned where user_id = a), 0::bigint,
    'nothing of the player is left');
  return next is((select count(*) from levelmeup.ai_generations where user_id is null), 1::bigint, 'AI usage stays, without the player');
  return next is((select count(*) from levelmeup.quest_days where user_id = b), 1::bigint, 'other players are untouched');
end $$;

create function lmu_test.test_permissions() returns setof text language plpgsql as $$
declare
  f record;
begin
  for f in
    select p.oid, p.proname, p.prosecdef, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'levelmeup' order by p.proname
  loop
    return next ok(not has_function_privilege('authenticated', f.oid, 'EXECUTE'), format('players cannot run %s', f.proname));
    return next ok(not has_function_privilege('anon', f.oid, 'EXECUTE'), format('anon cannot run %s', f.proname));
    return next is(has_function_privilege('lmu_service', f.oid, 'EXECUTE'), f.prosecdef, format('lmu_service runs %s only if it is an entry point', f.proname));
    return next is(has_function_privilege('lmu_player', f.oid, 'EXECUTE'), f.proname = 'player_id', format('lmu_player runs %s only if it is player_id', f.proname));
    return next ok(f.proconfig @> array['search_path=levelmeup, pg_temp'], format('%s pins its search path', f.proname));
  end loop;
end $$;

create function lmu_test.test_lmu_service_calls_the_functions() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
begin
  return next is(lmu_test.try_service(format('select levelmeup.complete_quest(%L, %L, %s, now(), null, null)', a, lmu_test.ev(1), lmu_test.quest(a, 'core'))),
    null, 'lmu_service completes a quest through the function');
  return next matches(lmu_test.try_service(format('update levelmeup.character_state set xp_strength = 1 where user_id = %L', a)), '^42501',
    'lmu_service cannot write a table directly');
  return next matches(lmu_test.try_service(format('select levelmeup.add_xp(%L, ''{"strength": 100}'', 1)', a)), '^42501',
    'lmu_service cannot call the internal helpers');
end $$;

create function lmu_test.test_event_ids_cannot_be_reused() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  core bigint := lmu_test.quest(a, 'core');
  side bigint := lmu_test.quest(a, 'side1');
begin
  perform levelmeup.complete_quest(a, lmu_test.ev(1), core, now(), null, null);
  return next throws_ok(format('select levelmeup.complete_quest(%L, %L, %s, now(), null, null)', a, lmu_test.ev(1), side),
    'P0001', 'lmu:event_reused', 'the same event id for another quest is refused');
  return next throws_ok(format('select levelmeup.undo_quest(%L, %L, %s)', a, lmu_test.ev(1), core),
    'P0001', 'lmu:event_reused', 'the same event id for another action is refused');
  return next is((select completed_at is not null from levelmeup.quest_instances where id = core), true, 'and the first action stands');
  return next is((select completed_at from levelmeup.quest_instances where id = side), null, 'and the other quest is untouched');
end $$;

create function lmu_test.test_restart_player() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  b uuid := lmu_test.start(2);
  again jsonb := '{"name": "Again", "voice": "mentor", "classId": "monk", "timeZone": "Asia/Manila", "boundaryMinutes": 300,
    "minutesPerDay": 15, "difficulty": "gentle", "goals": ["energy"], "limitations": [], "gentleStart": true,
    "ownProgram": false, "reveal": {}}';
  points jsonb := '{"strength": 5, "vitality": 7, "wisdom": 5, "focus": 5, "discipline": 4}';
  redo text := 'select levelmeup.restart_player(%L, %L, %L, ''{}'', lmu_test.day(1, now(), now() + interval ''8 hours''))';
begin
  perform levelmeup.reserve_ai_call(a, 'onboarding', 'test-model', 3);
  perform levelmeup.restart_player(a, again, points, '{}', lmu_test.day(1, now(), now() + interval '8 hours'));
  return next is((select class_id || '/' || voice || '/' || minutes_per_day from levelmeup.profiles where user_id = a),
    'monk/mentor/15', 'the corrected profile replaces the first one');
  return next is((select start_vitality from levelmeup.character_state where user_id = a), 7::smallint, 'and the start points');
  return next is((select count(*) from levelmeup.ladder_states where user_id = a), 0::bigint, 'and the starting ladders');
  return next is((select count(*) from levelmeup.quest_days where user_id = a), 1::bigint, 'day 1 is built again, once');
  return next is(lmu_test.version(a), 2, 'the version moves on, so nothing planned for the first character matches the new one');
  return next is((select count(*) from levelmeup.ai_generations where user_id = a), 1::bigint,
    'the Claude calls already made still count towards the cap');

  perform levelmeup.complete_quest(b, lmu_test.ev(1), lmu_test.quest(b, 'core'), now(), null, null);
  return next throws_ok(format(redo, b, again, points), 'P0001', 'lmu:locked', 'once the player has done something, it can''t run again');
  return next is((select class_id from levelmeup.profiles where user_id = b), 'warrior', 'and the profile is untouched');
  return next is((select xp_vitality from levelmeup.character_state where user_id = b), 20, 'and nothing earned is lost');
  return next throws_ok(format(redo, lmu_test.uid(9), again, points), 'P0001', 'lmu:not_started', 'there is nothing to redo before onboarding');
end $$;
