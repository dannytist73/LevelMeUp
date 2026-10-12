-- Reading (migration 0015): each day's article is a published one, the reading quest needs one and counts towards
-- "articles read", the Mage's Insight. Runs inside a transaction that always rolls back, after _helpers.sql.

-- An article of the library, stored by the pipeline's own functions: published, or waiting for review (evergreen).
create function lmu_test.library_article(p_topic text, p_evergreen boolean) returns text language plpgsql as $$
declare
  job bigint;
begin
  select q into job from levelmeup.article_queue(jsonb_build_array(jsonb_build_object('cluster', 'sleep', 'topic', p_topic, 'evergreen', p_evergreen))) q;
  perform levelmeup.article_job_move(job, 'queued', 'writing', '{}');
  return levelmeup.article_store(job,
    '{"title": "How sleep cycles work", "summary": "A night of sleep runs in cycles of about ninety minutes.",
      "sections": [{"heading": "Cycles", "paragraphs": ["Text."], "systemNote": null, "sourceIds": [1]}],
      "takeaways": ["Keep a steady wake-up time."], "reflectionQuestion": "When do you wake up?", "words": 900, "readingMinutes": 5}',
    '[{"idx": 1, "url": "https://example.org/sleep", "title": "Sleep"}]');
end $$;

-- The reading quest, as _shared/advance.ts drafts it.
create function lmu_test.article_quest() returns jsonb language sql immutable as $$
  select '[{"slot": "article", "templateId": "article", "ladder": null, "rung": null, "stat": "wisdom", "tier": "minor",
    "minutes": 6, "completion": "text", "condition": {"kind": "sentence"}, "xp": {"wisdom": 10}, "why": {"code": "article"}}]'::jsonb
$$;

-- A Mage whose day 1 (running now) has the reading quest and this article (or none).
create function lmu_test.reader(p_n int, p_article text) returns uuid language plpgsql as $$
declare
  me uuid := lmu_test.uid(p_n);
begin
  insert into auth.users (id, aud, role, is_anonymous) values (me, 'authenticated', 'authenticated', true);
  perform levelmeup.start_player(me,
    '{"name": "Reader", "voice": "system", "classId": "mage", "timeZone": "Asia/Manila", "boundaryMinutes": 240,
      "minutesPerDay": 25, "difficulty": "steady", "goals": ["learn"], "limitations": [], "gentleStart": false,
      "ownProgram": false, "reveal": {}}',
    '{"strength": 5, "vitality": 5, "wisdom": 9, "focus": 5, "discipline": 4}', '{}',
    lmu_test.day(1, now() - interval '1 hour', now() + interval '10 hours')
      || jsonb_build_object('articleId', p_article, 'quests', lmu_test.quests() || lmu_test.article_quest()));
  return me;
end $$;

create function lmu_test.test_reading_day_article() returns setof text language plpgsql as $$
declare
  published text := lmu_test.library_article('How sleep cycles work', false);
  waiting text := lmu_test.library_article('Why naps help', true);
  a uuid := lmu_test.reader(1, published);
  b uuid := lmu_test.reader(2, waiting);
  c uuid := lmu_test.reader(3, 'article-999999999');
begin
  return next is((select article_id from levelmeup.quest_days where user_id = a), published, 'a published article is kept on its day');
  return next is((select article_id from levelmeup.quest_days where user_id = b), null, 'an article waiting for review never reaches a day');
  return next is((select article_id from levelmeup.quest_days where user_id = c), null, 'an id outside the library is dropped');
  return next ok(exists (select 1 from pg_constraint where conname = 'quest_days_article_id_fkey'), 'a day''s article is a library article');
end $$;

create function lmu_test.test_reading_claim() returns setof text language plpgsql as $$
declare
  article text := lmu_test.library_article('How sleep cycles work', false);
  a uuid := lmu_test.reader(1, article);
  b uuid := lmu_test.reader(2, null);
begin
  return next throws_ok(format('select levelmeup.complete_quest(%L, %L, %s, now(), null, %L)', b, lmu_test.ev(1),
    lmu_test.quest(b, 'article'), '{"text": "One idea."}'), 'P0001', 'lmu:no_article', 'the reading quest waits on a day without an article');
  perform levelmeup.complete_quest(a, lmu_test.ev(2), lmu_test.quest(a, 'article'), now(), null, '{"text": "One idea."}');
  return next is((select articles_read from levelmeup.character_state where user_id = a), 1, 'a claimed reading counts');
  return next is((select xp_wisdom from levelmeup.character_state where user_id = a), 10, 'and pays its 10 Wisdom XP');
  return next is((select payload ->> 'text' from levelmeup.quest_instances where id = lmu_test.quest(a, 'article')), 'One idea.',
    'the takeaway is kept with the quest');
  perform levelmeup.undo_quest(a, lmu_test.ev(3), lmu_test.quest(a, 'article'));
  return next is((select articles_read from levelmeup.character_state where user_id = a), 0, 'its undo takes the reading back');
  perform levelmeup.complete_quest(a, lmu_test.ev(4), lmu_test.quest(a, 'core'), now(), null, null);
  return next is((select articles_read from levelmeup.character_state where user_id = a), 0, 'other quests are not readings');
end $$;

create function lmu_test.test_insight() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.reader(1, null);
  v int;
begin
  v := lmu_test.version(a);
  return next is(levelmeup.set_insight(a, lmu_test.ev(1), 'philosophy', 1) ->> 'cluster', 'philosophy', 'Insight keeps the chosen topic');
  return next is((select insight from levelmeup.character_state where user_id = a), '{"cluster": "philosophy", "day": 1}'::jsonb,
    'with the day it was chosen on');
  return next is(lmu_test.version(a), v + 1, 'and moves the version on, so a day being built plans again');
  return next is(levelmeup.set_insight(a, lmu_test.ev(1), 'philosophy', 1) ->> 'cluster', 'philosophy', 'a repeat answers the same');
  perform levelmeup.set_insight(a, lmu_test.ev(2), 'history', 1);
  return next is((select insight ->> 'cluster' from levelmeup.character_state where user_id = a), 'history', 'the last choice wins');
  return next throws_ok(format('select levelmeup.set_insight(%L, %L, %L, 1)', a, lmu_test.ev(3), 'cooking'),
    'P0001', 'lmu:bad_change', 'only the eight topics');
  return next throws_ok(format('select levelmeup.set_insight(%L, %L, %L, 2)', a, lmu_test.ev(4), 'sleep'),
    'P0001', 'lmu:day_closed', 'only on an open day');
  update levelmeup.quest_days set starts_at = now() - interval '25 hours', ends_at = now() - interval '1 hour' where user_id = a;
  return next throws_ok(format('select levelmeup.set_insight(%L, %L, %L, 1)', a, lmu_test.ev(5), 'sleep'),
    'P0001', 'lmu:day_closed', 'nor on a day that has ended, before it is closed (review)');
  return next throws_ok(format('select levelmeup.complete_quest(%L, %L, %s, now(), null, null)', a, lmu_test.ev(2), lmu_test.quest(a, 'core')),
    'P0001', 'lmu:event_reused', 'an Insight event''s id is never reused');
end $$;

create function lmu_test.test_reading_rights() returns setof text language plpgsql as $$
begin
  return next ok(not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'levelmeup' and p.proname = 'reserve_ai_call'), 'reserve_ai_call is gone (M8a carried row)');
  return next ok(has_function_privilege('lmu_service', 'levelmeup.set_insight(uuid, uuid, text, int)', 'execute'), 'lmu_service may set Insight');
  return next ok(not has_function_privilege('lmu_player', 'levelmeup.set_insight(uuid, uuid, text, int)', 'execute'), 'a player may not');
  return next ok(not has_function_privilege('anon', 'levelmeup.set_insight(uuid, uuid, text, int)', 'execute'), 'nor anyone else');
  return next ok((select prosecdef from pg_proc where oid = 'levelmeup.set_insight(uuid, uuid, text, int)'::regprocedure),
    'it is a security definer');
end $$;
