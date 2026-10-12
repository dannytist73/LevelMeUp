-- The article library (migration 0014): the budget, the pipeline's functions, and what players may read.
-- Runs inside a transaction that always rolls back, after _helpers.sql.

-- A job moved to 'writing', as the pipeline leaves it before an article is stored.
create function lmu_test.writing_job(p_topic text, p_evergreen boolean) returns bigint language plpgsql as $$
declare
  id bigint;
begin
  select q into id from levelmeup.article_queue(jsonb_build_array(jsonb_build_object('cluster', 'sleep', 'topic', p_topic, 'evergreen', p_evergreen))) q;
  perform levelmeup.article_job_move(id, 'queued', 'writing', '{}');
  return id;
end $$;

create function lmu_test.article_json() returns jsonb language sql immutable as $$
  select '{"title": "How sleep cycles work", "summary": "A night of sleep runs in cycles of about ninety minutes.",
    "sections": [{"heading": "Cycles", "paragraphs": ["Text."], "systemNote": null, "sourceIds": [1]}],
    "takeaways": ["Keep a steady wake-up time."], "reflectionQuestion": "When do you wake up?", "words": 900, "readingMinutes": 5}'::jsonb
$$;

create function lmu_test.test_ai_budget() returns setof text language plpgsql as $$
declare
  rid bigint;
begin
  -- Mocked costs: last month's spend doesn't count; this month's is brought to $0.10 under the cap.
  insert into levelmeup.ai_generations (kind, model, status, cost_usd, created_at)
    values ('article', 'claude-opus-5-5', 'ok', 100, now() - interval '40 days');
  insert into levelmeup.ai_generations (kind, model, status, cost_usd)
    values ('article', 'claude-opus-5-5', 'ok', greatest(25 - levelmeup.ai_month_spend() - 0.10, 0));
  return next throws_ok($q$ select levelmeup.reserve_ai_spend(null, 'article', 'claude-opus-5-5', 0.20, 25, null, null) $q$,
    'P0001', 'lmu:ai_budget', 'a call that would pass the month''s cap is refused');
  rid := levelmeup.reserve_ai_spend(null, 'article', 'claude-opus-5-5', 0.05, 25, null, null);
  return next is((select cost_usd from levelmeup.ai_generations where id = rid), 0.05::numeric(10, 6), 'the estimate is held while the call runs');
  return next is((select status from levelmeup.ai_generations where id = rid), 'pending', 'the call is pending');
  return next throws_ok($q$ select levelmeup.reserve_ai_spend(null, 'article', 'claude-opus-5-5', 0.06, 25, null, null) $q$,
    'P0001', 'lmu:ai_budget', 'pending estimates count against the cap');
  perform levelmeup.finish_ai_call(rid, 'ok', 1000, 500, 0.01, null);
  return next is((select cost_usd from levelmeup.ai_generations where id = rid), 0.01::numeric(10, 6), 'the real cost replaces the estimate');
  return next ok(levelmeup.reserve_ai_spend(null, 'article', 'claude-opus-5-5', 0.05, 25, null, null) is not null, 'the freed room can be used');
  return next throws_ok($q$ select levelmeup.reserve_ai_spend(null, 'article', 'claude-opus-5-5', -1, 25, null, null) $q$,
    'P0001', 'lmu:bad_budget', 'a negative estimate is refused');
end $$;

create function lmu_test.test_ai_player_cap() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
begin
  perform levelmeup.reserve_ai_spend(a, 'onboarding', 'claude-opus-5-5', 0, 1000000, 1, null);
  return next throws_ok(format($q$ select levelmeup.reserve_ai_spend(%L, 'onboarding', 'claude-opus-5-5', 0, 1000000, 1, null) $q$, a),
    'P0001', 'lmu:ai_cap', 'a player''s own cap still applies');
end $$;

create function lmu_test.test_article_lease_and_night() returns setof text language plpgsql as $$
begin
  update levelmeup.article_pipeline set ticking_until = null, queued_night = null;
  return next ok(levelmeup.article_tick_begin(60), 'the first tick takes the lease');
  return next ok(not levelmeup.article_tick_begin(60), 'a second tick waits');
  perform levelmeup.article_tick_end();
  return next ok(levelmeup.article_tick_begin(60), 'the lease is free again after the end');
  update levelmeup.article_pipeline set ticking_until = now() - interval '1 second';
  return next ok(levelmeup.article_tick_begin(60), 'a lapsed lease can be taken');
  return next ok(levelmeup.article_claim_night('2026-10-13'), 'the first tick of a night claims it');
  return next ok(not levelmeup.article_claim_night('2026-10-13'), 'a night is claimed once');
  return next ok(not levelmeup.article_claim_night('2026-10-12'), 'an earlier night can''t be claimed');
  return next ok(levelmeup.article_claim_night('2026-10-14'), 'the next night can');
end $$;

create function lmu_test.test_article_jobs() returns setof text language plpgsql as $$
declare
  ids bigint[];
  a bigint;
begin
  select array_agg(q) into ids from levelmeup.article_queue('[{"cluster": "habits", "topic": "Topic A"}, {"cluster": "focus", "topic": "Topic B", "evergreen": true}]') q;
  a := ids[1];
  return next is(array_length(ids, 1), 2, 'two jobs are queued');
  return next is((select status from levelmeup.article_jobs where id = a), 'queued', 'a job starts queued');
  return next ok((select evergreen from levelmeup.article_jobs where id = ids[2]), 'the evergreen flag is kept');
  return next ok(exists (select 1 from levelmeup.article_jobs_open() j where j.id = a), 'open jobs include it');
  return next ok(exists (select 1 from levelmeup.article_topics_used() t where t.cluster = 'habits' and t.topic = 'Topic A'), 'its topic counts as used');
  return next ok(levelmeup.article_job_move(a, 'queued', 'researching', '{"aiCallId": 7, "submittedAt": "2026-10-13T18:00:00Z", "batchId": null}'), 'a job moves from the status seen');
  return next ok(not levelmeup.article_job_move(a, 'queued', 'researching', '{}'), 'a second move from the old status fails');
  return next is((select ai_call_id from levelmeup.article_jobs where id = a), 7::bigint, 'the call id is set');
  perform levelmeup.article_job_move(a, 'researching', 'researched', '{"brief": {"sources": []}, "aiCallId": null, "error": "x"}');
  return next is((select brief from levelmeup.article_jobs where id = a), '{"sources": []}'::jsonb, 'the brief is stored');
  return next is((select ai_call_id from levelmeup.article_jobs where id = a), null::bigint, 'a JSON null clears a field');
  perform levelmeup.article_job_move(a, 'researched', 'researched', '{"brief": null}');
  return next is((select brief from levelmeup.article_jobs where id = a), null::jsonb, 'the brief can be cleared');
  perform levelmeup.article_job_move(a, 'researched', 'queued', '{"attempt": 2}');
  return next is((select attempt from levelmeup.article_jobs where id = a), 2, 'the attempt is set');
  return next throws_ok(format($q$ select levelmeup.article_job_move(%s, 'queued', 'queued', '{"attempt": 3}') $q$, a), '23514', null, 'a third attempt is refused');
end $$;

create function lmu_test.test_article_store() returns setof text language plpgsql as $$
declare
  daily bigint := lmu_test.writing_job('Topic daily', false);
  green bigint := lmu_test.writing_job('Topic evergreen', true);
  stored text;
begin
  stored := levelmeup.article_store(daily, lmu_test.article_json(), '[{"idx": 1, "url": "https://example.org/sleep", "title": "Sleep"}]');
  return next is(stored, 'article-' || daily, 'an article''s id is article-<job>');
  return next is((select status from levelmeup.articles where id = stored), 'published', 'a daily article is published');
  return next ok((select published_at from levelmeup.articles where id = stored) is not null, 'with its publishing time');
  return next is((select reading_minutes from levelmeup.articles where id = stored), 5, 'the reading time is stored');
  return next is((select count(*) from levelmeup.article_sources where article_id = stored), 1::bigint, 'its sources are stored');
  return next is((select status from levelmeup.article_jobs where id = daily), 'done', 'its job is done');
  return next is((select article_id from levelmeup.article_jobs where id = daily), stored, 'the job names its article');
  stored := levelmeup.article_store(green, lmu_test.article_json(), '[]');
  return next is((select status from levelmeup.articles where id = stored), 'review', 'an evergreen article waits for review');
  return next is((select published_at from levelmeup.articles where id = stored), null::timestamptz, 'unpublished');
  return next throws_ok(format($q$ select levelmeup.article_store(%s, lmu_test.article_json(), '[]') $q$, daily), 'P0001', 'lmu:conflict', 'a job stores one article');
  return next throws_ok(format($q$ select levelmeup.article_store(%s, lmu_test.article_json(), '[{"idx": 1, "url": "ftp://x", "title": "X"}]') $q$,
    lmu_test.writing_job('Topic bad source', false)), '23514', null, 'a source must be a web address');
end $$;

create function lmu_test.test_article_short_players() returns setof text language plpgsql as $$
declare
  big int := (select count(*)::int from levelmeup.articles where status = 'published') + 1;
  before int := levelmeup.article_short_players(big);
  a uuid := lmu_test.start(1);
begin
  return next is(levelmeup.article_short_players(big), before + 1, 'a player who played this week and has too few articles counts');
  update levelmeup.quest_days set created_at = now() - interval '8 days' where user_id = a;
  return next is(levelmeup.article_short_players(big), before, 'a player away for a week does not');
  return next is(levelmeup.article_short_players(0), 0, 'nobody is short of zero articles');
end $$;

create function lmu_test.test_article_reads() returns setof text language plpgsql as $$
declare
  a uuid := lmu_test.start(1);
  daily text := levelmeup.article_store(lmu_test.writing_job('Read daily', false), lmu_test.article_json(), '[{"idx": 1, "url": "https://example.org/a", "title": "A"}]');
  green text := levelmeup.article_store(lmu_test.writing_job('Read evergreen', true), lmu_test.article_json(), '[{"idx": 1, "url": "https://example.org/b", "title": "B"}]');
begin
  return next is(lmu_test.count_as(a, format('select 1 from levelmeup.articles where id = %L', daily)), 1::bigint, 'a player reads a published article');
  return next is(lmu_test.count_as(a, format('select 1 from levelmeup.articles where id = %L', green)), 0::bigint, 'not one waiting for review');
  return next is(lmu_test.count_as(a, format('select 1 from levelmeup.article_sources where article_id = %L', daily)), 1::bigint, 'the sources of a published one');
  return next is(lmu_test.count_as(a, format('select 1 from levelmeup.article_sources where article_id = %L', green)), 0::bigint, 'not of one waiting');
  return next matches(lmu_test.try_as(a, 'select * from levelmeup.article_jobs'), '^42501', 'players cannot read the jobs');
  return next matches(lmu_test.try_as(a, 'select * from levelmeup.article_pipeline'), '^42501', 'or the lease');
  return next matches(lmu_test.try_service('select * from levelmeup.articles'), '^42501', 'lmu_service reads articles only as a player');
  return next is(lmu_test.try_service('select * from levelmeup.article_jobs_open()'), null, 'lmu_service runs the pipeline''s functions');
  return next matches(lmu_test.try_service('update levelmeup.article_jobs set status = ''done'''), '^42501', 'but cannot write a job directly');
end $$;
