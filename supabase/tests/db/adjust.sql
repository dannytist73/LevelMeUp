-- levelmeup.adjust (migration 0008, M6b): each guard, the writes, a repeat, and who may call it.
-- Runs inside a transaction that always rolls back, after _helpers.sql.

-- The player's latest day.
create function lmu_test.day_of(p_user uuid) returns bigint language sql stable as $$
  select id from levelmeup.quest_days where user_id = p_user order by day_number desc limit 1
$$;

-- A quest as _shared/adjust.ts sends it: the player's quest in p_slot, replaced by a 3-minute mobility quest.
create function lmu_test.swapped(p_user uuid, p_slot text) returns jsonb language sql stable as $$
  select jsonb_build_object('id', lmu_test.quest(p_user, p_slot), 'slot', p_slot, 'templateId', 'mobility-0',
    'ladder', 'mobility', 'rung', 0, 'stat', 'vitality', 'tier', 'minor', 'minutes', 3, 'completion', 'timer',
    'condition', '{"kind": "minutes", "minutes": 3}'::jsonb, 'hardDay', false, 'xp', '{"vitality": 10}'::jsonb,
    'why', '{"code": "swap"}'::jsonb, 'book', null)
$$;

create function lmu_test.test_adjust_swap() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  core bigint := lmu_test.quest(a, 'core');
  payload jsonb := jsonb_build_object('instanceId', core, 'templateId', 'mobility-0');
  change jsonb := jsonb_build_object('day', jsonb_build_object('id', lmu_test.day_of(a), 'swaps', 1),
    'quests', jsonb_build_array(lmu_test.swapped(a, 'core')));
  first jsonb;
begin
  first := levelmeup.adjust(a, lmu_test.ev(1), 1, 'swap', payload, change);
  return next is(first, '{"type": "swap", "version": 2}'::jsonb, 'the result names the change and the new version');
  return next is((select template_id || '/' || minutes || '/' || (xp ->> 'vitality') from levelmeup.quest_instances where id = core),
    'mobility-0/3/10', 'the quest is replaced in place, with the drafted snapshot');
  return next is((select swaps_used from levelmeup.quest_days where id = lmu_test.day_of(a)), 1::smallint, 'the swap is counted');
  return next is((select count(*) from levelmeup.events where user_id = a and type = 'swap'), 1::bigint, 'the event is stored');
  return next is(levelmeup.adjust(a, lmu_test.ev(1), 99, 'swap', payload, '{}'), first, 'a repeat returns the stored result, whatever the version');
  return next is(lmu_test.version(a), 2, 'and changes nothing');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 2, ''plan_rest'', ''{"dayId": 1}'', ''{}'')', a, lmu_test.ev(1)),
    'P0001', 'lmu:event_reused', 'the same id for another action is refused');
  return next throws_ok(format('select levelmeup.undo_quest(%L, %L, %s)', a, lmu_test.ev(1), core),
    'P0001', 'lmu:event_reused', 'and the completion functions refuse it too');
end $$;

create function lmu_test.test_adjust_guards() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  b uuid := lmu_test.start(2);
  late uuid := lmu_test.start(3, now() - interval '25 hours', now() - interval '1 minute');
  adj text := 'select levelmeup.adjust(%L, %L, %s, %L, ''{}'', %L)';
  day_a jsonb := jsonb_build_object('id', lmu_test.day_of(a));
begin
  return next throws_ok(format(adj, a, lmu_test.ev(1), 7, 'swap', jsonb_build_object('day', day_a)),
    'P0001', 'lmu:conflict', 'a change planned on an older version is refused');
  return next throws_ok(format(adj, a, lmu_test.ev(2), 1, 'nonsense', '{}'), 'P0001', 'lmu:bad_change', 'an unknown kind of change is refused');
  return next throws_ok(format(adj, b, lmu_test.ev(3), 1, 'swap', jsonb_build_object('day', day_a)),
    'P0001', 'lmu:not_found', 'another player''s day is not found');
  return next throws_ok(format(adj, late, lmu_test.ev(4), 1, 'plan_rest',
      jsonb_build_object('day', jsonb_build_object('id', lmu_test.day_of(late), 'protection', 'planned_rest'))),
    'P0001', 'lmu:day_closed', 'a day that has ended takes no changes, even before it is closed');
  return next throws_ok(format(adj, a, lmu_test.ev(5), 1, 'swap', jsonb_build_object('quests', jsonb_build_array(lmu_test.swapped(a, 'core')))),
    'P0001', 'lmu:bad_change', 'quests change only on a day the change names');
  return next throws_ok(format(adj, a, lmu_test.ev(6), 1, 'swap', jsonb_build_object('day', day_a, 'quests', jsonb_build_array(lmu_test.swapped(b, 'core')))),
    'P0001', 'lmu:not_found', 'another player''s quest is not found');
  return next throws_ok(format(adj, a, lmu_test.ev(7), 1, 'swap',
      jsonb_build_object('day', day_a, 'quests', jsonb_build_array(lmu_test.swapped(a, 'core') || '{"slot": "side1"}'))),
    'P0001', 'lmu:bad_change', 'a quest keeps its slot');
  return next throws_ok(format(adj, a, lmu_test.ev(8), 1, 'plan_rest', jsonb_build_object('day', day_a || '{"protection": "outage"}')),
    'P0001', 'lmu:bad_change', 'only rest and pain protect a day from here');
  return next throws_ok(format(adj, a, lmu_test.ev(9), 1, 'ability', '{"ability": {"id": "vanish", "day": 1}}'),
    'P0001', 'lmu:bad_change', 'only Stillness and Dawn Ritual are recorded from here');
  return next throws_ok(format(adj, a, lmu_test.ev(10), 1, 'swap',
      jsonb_build_object('day', day_a, 'quests', jsonb_build_array(lmu_test.swapped(a, 'core') || '{"xp": {"vitality": 5000}}'))),
    '23514', null, 'an XP snapshot over 200 is refused');
  perform levelmeup.complete_quest(a, lmu_test.ev(11), lmu_test.quest(a, 'core'), now(), null, null);
  return next throws_ok(format(adj, a, lmu_test.ev(12), 2, 'swap', jsonb_build_object('day', day_a, 'quests', jsonb_build_array(lmu_test.swapped(a, 'core')))),
    'P0001', 'lmu:already_completed', 'a cleared quest is never replaced');
  return next is(lmu_test.version(a), 2, 'no refused change wrote anything');
end $$;

create function lmu_test.test_adjust_day_and_ladders() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  day bigint := lmu_test.day_of(a);
  resting jsonb := '{"rung": 0, "highestRung": 0, "atRung": [], "misses": [], "lastStepUpAt": null, "paused": true}';
begin
  perform levelmeup.adjust(a, lmu_test.ev(1), 1, 'hard_day', jsonb_build_object('dayId', day),
    jsonb_build_object('day', jsonb_build_object('id', day, 'hardDay', true)));
  return next is((select hard_day from levelmeup.quest_days where id = day), true, 'a hard day is marked');
  perform levelmeup.adjust(a, lmu_test.ev(2), 2, 'pain', '{"instanceId": 1, "choice": "rest"}',
    jsonb_build_object('day', jsonb_build_object('id', day, 'protection', 'pain'), 'ladders', jsonb_build_object('walk', resting)));
  return next is((select protection from levelmeup.quest_days where id = day), 'pain', 'a day rested after pain is protected');
  return next is((select state ->> 'paused' from levelmeup.ladder_states where user_id = a and ladder_id = 'walk'), 'true',
    'and the ladder rests');
  perform levelmeup.adjust(a, lmu_test.ev(3), 3, 'plan_rest', jsonb_build_object('dayId', day),
    jsonb_build_object('day', jsonb_build_object('id', day, 'protection', 'planned_rest')));
  return next is((select protection from levelmeup.quest_days where id = day), 'pain', 'a protected day keeps its first reason');
  perform levelmeup.adjust(a, lmu_test.ev(4), 4, 'pain', '{"instanceId": 2, "choice": "pause"}',
    jsonb_build_object('ladders', jsonb_build_object('micro-squats', resting)));
  return next is((select count(*) from levelmeup.ladder_states where user_id = a), 2::bigint,
    'a standalone exercise quest rests by its own id');
end $$;

create function lmu_test.test_adjust_class_and_ability() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
begin
  perform levelmeup.adjust(a, lmu_test.ev(1), 1, 'class_change', '{"classId": "monk"}', '{"classId": "monk"}');
  return next is((select class_id from levelmeup.profiles where user_id = a), 'monk', 'the class changes');
  return next ok((select class_changed_at > now() - interval '1 minute' from levelmeup.profiles where user_id = a), 'and the time is kept');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 2, ''class_change'', ''{"classId": "mage"}'', ''{"classId": "mage"}'')', a, lmu_test.ev(2)),
    'P0001', 'lmu:class_locked', 'a second change within 14 days is refused');
  update levelmeup.profiles set class_changed_at = now() - interval '14 days' where user_id = a;
  perform levelmeup.adjust(a, lmu_test.ev(3), 2, 'class_change', '{"classId": "mage"}', '{"classId": "mage"}');
  return next is((select class_id from levelmeup.profiles where user_id = a), 'mage', '14 days later it opens again');
  return next is((select start_strength || '/' || total_xp from levelmeup.character_state where user_id = a), '9/0',
    'stats and XP stay');
  perform levelmeup.adjust(a, lmu_test.ev(4), 3, 'ability', jsonb_build_object('dayId', lmu_test.day_of(a), 'ability', 'stillness'),
    jsonb_build_object('day', jsonb_build_object('id', lmu_test.day_of(a)),
      'quests', jsonb_build_array(lmu_test.swapped(a, 'core') || '{"templateId": "stillness", "why": {"code": "stillness"}}'),
      'ability', '{"id": "stillness", "day": 1}'::jsonb));
  return next is((select template_id from levelmeup.quest_instances where id = lmu_test.quest(a, 'core')), 'stillness',
    'the ability''s quest takes the core slot');
  return next is((select ability_last_used from levelmeup.character_state where user_id = a), '{"stillness": 1}'::jsonb,
    'and its quest day is kept');
end $$;

create function lmu_test.test_adjust_rights() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  stmt text := format('select levelmeup.adjust(%L, %L, 1, ''plan_rest'', ''{}'', ''{}'')', a, lmu_test.ev(1));
begin
  return next ok(lmu_test.try_as(a, stmt) like '42501%', 'a player can''t call it');
  return next ok(lmu_test.try_role('anon', stmt) like '42501%', 'nor can anyone signed out');
  return next is(lmu_test.try_service(stmt), null, 'the Edge Functions can');
end $$;

-- M6c: the training setup changes through adjust, re-planned quests with it.
create function lmu_test.test_adjust_training() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(51);
  setup jsonb := '{"equipment": ["gym"], "programStyle": "men"}';
begin
  perform levelmeup.adjust(a, lmu_test.ev(51), 1, 'training', setup, jsonb_build_object('training', setup));
  return next is((select equipment from levelmeup.profiles where user_id = a), array['gym'], 'the equipment changes');
  return next is((select program_style from levelmeup.profiles where user_id = a), 'men', 'the program style changes');
  return next is((select count(*) from levelmeup.events where user_id = a and type = 'training'), 1::bigint, 'the event is stored');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 2, ''training'', ''{}'', %L)', a, lmu_test.ev(52),
      '{"training": {"equipment": [], "programStyle": "unisex"}}'),
    '23514', null, 'an unknown program style is refused by the table');
  perform levelmeup.adjust(a, lmu_test.ev(53), 2, 'training', '{}',
    jsonb_build_object('training', '{"equipment": [], "programStyle": "none"}'::jsonb, 'day', jsonb_build_object('id', lmu_test.day_of(a)),
      'quests', jsonb_build_array(lmu_test.swapped(a, 'core'))));
  return next is((select template_id from levelmeup.quest_instances where id = lmu_test.quest(a, 'core')), 'mobility-0',
    'a training change can replace an open quest on the day it names');
  return next is((select equipment from levelmeup.profiles where user_id = a), '{}'::text[], 'and empty equipment means bodyweight');
end $$;

-- M6d: Scholar's Path. Setting, finishing (with the sessions read since it was set) and setting aside a book.
create function lmu_test.test_adjust_book() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(61);
  core bigint := lmu_test.quest(a, 'core');
begin
  perform levelmeup.adjust(a, lmu_test.ev(61), 1, 'book', '{"title": "Dune", "finished": false}',
    '{"book": {"title": "Dune", "finished": false}}');
  return next is((select book from levelmeup.profiles where user_id = a), 'Dune', 'the book is set');
  return next ok((select book_started_at is not null from levelmeup.profiles where user_id = a), 'with the time it was set');
  update levelmeup.quest_instances set book = 'Dune' where id = core;
  perform levelmeup.complete_quest(a, lmu_test.ev(62), core, now(), null, '{}');
  perform levelmeup.adjust(a, lmu_test.ev(63), lmu_test.version(a), 'book', '{"title": null, "finished": true}',
    '{"book": {"title": null, "finished": true}}');
  return next is((select book from levelmeup.profiles where user_id = a), null, 'finishing clears the book');
  return next ok((select book_started_at is null from levelmeup.profiles where user_id = a), 'and its start');
  return next is((select books_finished -> 0 ->> 'title' from levelmeup.profiles where user_id = a), 'Dune', 'and records it');
  return next is((select (books_finished -> 0 ->> 'sessions')::int from levelmeup.profiles where user_id = a), 1, 'with its sessions');
  return next is((select (books_finished -> 0 ->> 'minutes')::int from levelmeup.profiles where user_id = a), 10, 'and minutes');
  return next ok((select (books_finished -> 0 ->> 'finishedAt') ~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$' from levelmeup.profiles where user_id = a),
    'times are stored as ISO strings the phone can read');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, %s, ''book'', ''{}'', %L)', a, lmu_test.ev(64), lmu_test.version(a),
      '{"book": {"title": null, "finished": true}}'),
    'P0001', 'lmu:bad_change', 'finishing without a book is refused');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, %s, ''book'', ''{}'', %L)', a, lmu_test.ev(65), lmu_test.version(a),
      jsonb_build_object('book', jsonb_build_object('title', repeat('x', 121), 'finished', false))),
    '23514', null, 'a title over 120 characters is refused by the table');
end $$;

-- M6d review: what a finished book counts (only its own quests, completed since it was set), a direct switch, and the
-- newest 100 finished books.
create function lmu_test.test_adjust_book_history() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(62);
  core bigint := lmu_test.quest(a, 'core');
  side1 bigint := lmu_test.quest(a, 'side1');
  side2 bigint := lmu_test.quest(a, 'side2');
begin
  perform levelmeup.adjust(a, lmu_test.ev(71), 1, 'book', '{}', '{"book": {"title": "Dune", "finished": false}}');
  perform levelmeup.adjust(a, lmu_test.ev(72), lmu_test.version(a), 'book', '{}', '{"book": {"title": "Meditations", "finished": false}}');
  return next is((select book from levelmeup.profiles where user_id = a), 'Meditations', 'a switch sets the new book');
  return next is((select jsonb_array_length(books_finished) from levelmeup.profiles where user_id = a), 0, 'and records nothing');
  -- The book counts from when it was set (10 minutes ago here): the core quest, completed 30 minutes ago, doesn't count;
  -- nor does side2, read with another book.
  update levelmeup.profiles set book_started_at = now() - interval '10 minutes' where user_id = a;
  update levelmeup.quest_instances set book = 'Meditations' where id in (core, side1);
  update levelmeup.quest_instances set book = 'Dune' where id = side2;
  perform levelmeup.complete_quest(a, lmu_test.ev(73), core, now() - interval '30 minutes', null, '{}');
  perform levelmeup.complete_quest(a, lmu_test.ev(74), side1, now(), null, '{}');
  perform levelmeup.complete_quest(a, lmu_test.ev(75), side2, now(), null, '{}');
  perform levelmeup.adjust(a, lmu_test.ev(76), lmu_test.version(a), 'book', '{}', '{"book": {"title": null, "finished": true}}');
  return next is((select books_finished -> 0 ->> 'title' from levelmeup.profiles where user_id = a), 'Meditations', 'the finished book');
  return next is((select (books_finished -> 0 ->> 'sessions')::int from levelmeup.profiles where user_id = a), 1,
    'counts only its own quests completed since it was set');
  return next is((select (books_finished -> 0 ->> 'minutes')::int from levelmeup.profiles where user_id = a), 5, 'and their minutes');
  -- The newest 100 are kept: finishing a 101st drops the oldest.
  update levelmeup.profiles set book = 'Last', book_started_at = now(), books_finished = (
      select jsonb_agg(jsonb_build_object('title', 'Book ' || i, 'startedAt', null, 'finishedAt', '2026-01-01T00:00:00.000Z',
        'sessions', 0, 'minutes', 0) order by i)
      from generate_series(1, 100) i)
  where user_id = a;
  perform levelmeup.adjust(a, lmu_test.ev(77), lmu_test.version(a), 'book', '{}', '{"book": {"title": null, "finished": true}}');
  return next is((select jsonb_array_length(books_finished) from levelmeup.profiles where user_id = a), 100, 'at most 100 finished books');
  return next is((select books_finished -> 0 ->> 'title' from levelmeup.profiles where user_id = a), 'Book 2', 'the oldest goes');
  return next is((select books_finished -> 99 ->> 'title' from levelmeup.profiles where user_id = a), 'Last', 'the newest is last');
end $$;

-- M7a: the check-in's answer (decisions 2–6) and the lighter plan (decision 9).
create function lmu_test.test_adjust_checkin() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  today bigint := lmu_test.day_of(a);
  g bigint;
  c bigint;
  recovery jsonb := '{"templateId": "recovery-walk", "ladder": null, "rung": null, "stat": "discipline", "tier": "minor",
    "minutes": 5, "completion": "tap", "condition": {"kind": "habit"}, "hardDay": false, "xp": {"discipline": 5},
    "why": {"code": "recovery"}, "book": null}';
begin
  insert into levelmeup.checkins (user_id, gap_from, gap_to) values (a, 5, 6) returning id into g;
  insert into levelmeup.checkins (user_id, gap_from, gap_to) values (a, 7, 7) returning id into c;
  update levelmeup.character_state set awaiting_checkin = true, streak_current = 4, streak_best = 4 where user_id = a;

  perform levelmeup.adjust(a, lmu_test.ev(1), 1, 'checkin', jsonb_build_object('checkinId', g, 'answer', 'just_didnt', 'secondWind', false),
    jsonb_build_object('day', jsonb_build_object('id', today),
      'checkin', jsonb_build_object('id', g, 'answer', 'just_didnt', 'recoveryDayId', today, 'outcome', null),
      'recovery', recovery));
  return next is((select answer || '/' || (recovery_day_id = today) || '/' || (resolved_at is null) from levelmeup.checkins where id = g),
    'just_didnt/true/true', '"I just didn''t" is stored and waits for today to end');
  return next is((select template_id || '/' || (xp ->> 'discipline') from levelmeup.quest_instances where day_id = today and slot = 'recovery'),
    'recovery-walk/5', 'the recovery quest joins today');
  return next ok((select awaiting_checkin from levelmeup.character_state where user_id = a), 'the streak is held until then');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 2, ''checkin'', ''{}'', %L)', a, lmu_test.ev(2),
      jsonb_build_object('checkin', jsonb_build_object('id', g, 'answer', 'sick', 'recoveryDayId', null, 'outcome', 'protected'))),
    'P0001', 'lmu:already_answered', 'an answered check-in takes no other answer');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 2, ''checkin'', ''{}'', %L)', a, lmu_test.ev(3),
      jsonb_build_object('day', jsonb_build_object('id', today),
        'checkin', jsonb_build_object('id', c, 'answer', 'just_didnt', 'recoveryDayId', today + 1, 'outcome', null))),
    'P0001', 'lmu:bad_change', 'the recovery day is the day the change names');

  perform levelmeup.adjust(a, lmu_test.ev(4), 2, 'checkin', '{"answer": "lighter_load"}'::jsonb,
    jsonb_build_object('checkin', jsonb_build_object('id', c, 'answer', 'lighter_load', 'recoveryDayId', null, 'outcome', 'protected'),
      'streak', '{"current": 4, "best": 4, "shields": 0, "awaitingCheckin": false}'::jsonb,
      'minutes', 15, 'lighterPlanAt', true, 'lightNext', true));
  return next is((select outcome || '/' || (resolved_at is not null) from levelmeup.checkins where id = c), 'protected/true',
    'a protected answer is resolved at once');
  return next is((select awaiting_checkin::text || '/' || next_day_light from levelmeup.character_state where user_id = a), 'false/true',
    'the streak goes on and the next day will be light');
  return next is((select minutes_per_day || '/' || (lighter_plan_at is not null) from levelmeup.profiles where user_id = a), '15/true',
    'the daily minutes drop and the offer is answered');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 3, ''lighter_plan'', ''{"accept": true}'', ''{"minutes": 12}'')', a, lmu_test.ev(5)),
    '23514', null, 'the table refuses minutes that are not an option');
  perform levelmeup.adjust(a, lmu_test.ev(6), 3, 'lighter_plan', '{"accept": false}', '{"lighterPlanAt": true}');
  return next is((select minutes_per_day from levelmeup.profiles where user_id = a), 15, '"Keep my plan" keeps the minutes');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 4, ''checkin'', ''{}'', %L)', a, lmu_test.ev(7),
      jsonb_build_object('recovery', recovery)),
    'P0001', 'lmu:bad_change', 'a recovery quest needs the day it joins');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 4, ''swap'', ''{}'', ''{"minutes": 10}'')', a, lmu_test.ev(8)),
    'P0001', 'lmu:bad_change', 'only the check-in and the lighter plan change the minutes');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 4, ''checkin'', ''{}'', %L)', a, lmu_test.ev(9),
      jsonb_build_object('checkin', jsonb_build_object('id', c, 'answer', 'just_didnt', 'recoveryDayId', null, 'outcome', 'recovered'))),
    'P0001', 'lmu:bad_change', 'an answer is resolved at once only as protected');
end $$;

create function lmu_test.test_adjust_second_wind() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
begin
  perform levelmeup.adjust(a, lmu_test.ev(1), 1, 'checkin', '{}',
    jsonb_build_object('day', jsonb_build_object('id', lmu_test.day_of(a)), 'ability', '{"id": "second_wind", "day": 1}'::jsonb));
  return next is((select ability_last_used from levelmeup.character_state where user_id = a), '{"second_wind": 1}'::jsonb,
    'Second Wind''s quest day is kept');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 2, ''checkin'', ''{}'', %L)', a, lmu_test.ev(2),
      '{"ability": {"id": "unbreakable", "day": 1}}'), 'P0001', 'lmu:bad_change', 'Unbreakable is never a player''s change');
end $$;

create function lmu_test.test_adjust_settings() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  s jsonb := '{"settings": {"voice": "questmaster", "boundaryMinutes": 300, "minutesPerDay": 40, "difficulty": "hard"}}';
begin
  perform levelmeup.adjust(a, lmu_test.ev(1), 1, 'settings', s -> 'settings', s);
  return next is((select voice || '/' || boundary_minutes || '/' || minutes_per_day || '/' || difficulty
      from levelmeup.profiles where user_id = a),
    'questmaster/300/40/hard', 'the settings change the profile');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 2, ''swap'', ''{}'', %L)', a, lmu_test.ev(2), s),
    'P0001', 'lmu:bad_change', 'the settings come only with their kind');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 2, ''settings'', ''{}'', %L)', a, lmu_test.ev(3),
      jsonb_set(s, '{settings,minutesPerDay}', '30')),
    '23514', null, 'the table refuses minutes it does not know');
  return next is(lmu_test.version(a), 2, 'a refused change writes nothing');
end $$;

create function lmu_test.test_adjust_rest_ahead() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  day bigint := lmu_test.day_of(a);
begin
  perform levelmeup.adjust(a, lmu_test.ev(1), 1, 'plan_rest', jsonb_build_object('dayId', day, 'tomorrow', true), '{"restDay": 2}');
  return next is((select rest_day from levelmeup.character_state where user_id = a), 2, 'a rest day is planned for tomorrow');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 2, ''plan_rest'', ''{}'', ''{"restDay": 3}'')', a, lmu_test.ev(2)),
    'P0001', 'lmu:bad_change', 'only for the day after the latest one');
  return next throws_ok(format('select levelmeup.adjust(%L, %L, 2, ''swap'', ''{}'', ''{"restDay": 2}'')', a, lmu_test.ev(3)),
    'P0001', 'lmu:bad_change', 'and only with a rest');
end $$;

create function lmu_test.test_adjust_late_rest() returns setof text language plpgsql as $$
declare
  late uuid := lmu_test.start(1, now() - interval '25 hours', now() - interval '1 minute');
  old uuid := lmu_test.start(2, now() - interval '74 hours', now() - interval '49 hours');
  day bigint := lmu_test.day_of(late);
  adj text := 'select levelmeup.adjust(%L, %L, 1, ''plan_rest'', ''{}'', %L)';
  rest jsonb := jsonb_build_object('id', lmu_test.day_of(late), 'protection', 'planned_rest');
  inside jsonb := to_jsonb(now() - interval '2 hours');
begin
  return next throws_ok(format(adj, late, lmu_test.ev(1), jsonb_build_object('day', rest)),
    'P0001', 'lmu:day_closed', 'an ended day without a tap time takes no changes, as before');
  return next throws_ok(format(adj, late, lmu_test.ev(2), jsonb_build_object('day', rest || jsonb_build_object('tappedAt', to_jsonb(now())))),
    'P0001', 'lmu:day_closed', 'a tap after the day ended does not count');
  return next throws_ok(format(adj, late, lmu_test.ev(3),
      jsonb_build_object('day', rest || jsonb_build_object('tappedAt', inside, 'hardDay', true))),
    'P0001', 'lmu:day_closed', 'after its end, only the protection can change');
  return next throws_ok(format(adj, old, lmu_test.ev(4), jsonb_build_object('day',
      jsonb_build_object('id', lmu_test.day_of(old), 'protection', 'planned_rest', 'tappedAt', to_jsonb(now() - interval '50 hours')))),
    'P0001', 'lmu:day_closed', 'not more than 48 hours after the day ended');
  perform levelmeup.adjust(late, lmu_test.ev(5), 1, 'plan_rest', jsonb_build_object('dayId', day),
    jsonb_build_object('day', rest || jsonb_build_object('tappedAt', inside)));
  return next is((select protection from levelmeup.quest_days where id = day), 'planned_rest',
    'a rest tapped while the day ran protects it after it ended, before it is closed');
end $$;
