-- The daily studio (migration 0018): a job the owner's PC has taken waits as 'studio', and its article is stored through
-- the tick's own functions. Runs inside a transaction that always rolls back, after _helpers.sql.

create function lmu_test.studio_article() returns jsonb language sql immutable as $$
  select '{"title": "Doing the hard task first", "summary": "Starting the day with the task that matters most.",
    "sections": [{"heading": "First", "paragraphs": ["Text."], "systemNote": null, "sourceIds": [1]}],
    "takeaways": ["Start with the hard task."], "reflectionQuestion": "What will you start with?", "words": 900, "readingMinutes": 5}'::jsonb
$$;

create function lmu_test.test_studio_jobs() returns setof text language plpgsql as $$
declare
  job bigint;
  stored text;
begin
  select q into job from levelmeup.article_queue('[{"cluster": "focus", "topic": "A studio topic for the test", "evergreen": false}]') q;
  return next ok(levelmeup.article_job_move(job, 'queued', 'studio', '{}'), 'a queued job can be taken by the studio');
  return next is((select status from levelmeup.article_jobs where id = job), 'studio', 'it waits as studio');
  return next ok(job in (select id from levelmeup.article_jobs_open()), 'a studio job is still open');
  return next ok(levelmeup.article_job_move(job, 'studio', 'studio', '{"attempt": 2, "error": "the research cited one page"}'), 'a second try keeps it in the studio');
  return next ok(levelmeup.article_job_move(job, 'studio', 'writing', '{"brief": {"sources": [], "facts": [], "excerpts": ["a passage"]}}'), 'the studio hands it to the store');
  stored := levelmeup.article_store(job, lmu_test.studio_article(), '[{"idx": 1, "url": "https://example.org/a", "title": "A source"}]');
  return next ok(levelmeup.article_set_deck(stored, '{"v": 2, "story": ["A card."], "picture": "story-v1/article-1.webp"}', null), 'its deck is set');
  return next is((select status from levelmeup.articles where id = stored), 'published', 'a studio article is published');
  return next is((select deck ->> 'picture' from levelmeup.articles where id = stored), 'story-v1/article-1.webp', 'with its picture');
  return next is((select brief -> 'excerpts' ->> 0 from levelmeup.article_jobs where id = job), 'a passage', 'its brief stays for the copying check');
  return next throws_ok($q$ update levelmeup.article_jobs set status = 'drafting' where id = (select max(id) from levelmeup.article_jobs) $q$,
    '23514', null, 'a status the pipeline doesn''t know is still refused');
end $$;
