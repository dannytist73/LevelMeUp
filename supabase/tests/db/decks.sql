-- The Story Deck (migration 0016, M11): which articles wait for a deck, how a try is taken and kept, and the column's guard.
-- Runs inside a transaction that always rolls back, after _helpers.sql. Uses articles.sql's helpers' shapes, made here.

create function lmu_test.deck_article(p_topic text, p_evergreen boolean) returns text language plpgsql as $$
declare
  id bigint;
begin
  select q into id from levelmeup.article_queue(jsonb_build_array(jsonb_build_object('cluster', 'sleep', 'topic', p_topic, 'evergreen', p_evergreen))) q;
  perform levelmeup.article_job_move(id, 'queued', 'writing', '{"brief": {"sources": [], "facts": [], "excerpts": ["An excerpt from a page."]}}');
  return levelmeup.article_store(id, '{"title": "How sleep cycles work", "summary": "A night of sleep runs in cycles of about ninety minutes.",
    "sections": [{"heading": "Cycles", "paragraphs": ["Text."], "systemNote": null, "sourceIds": [1]}],
    "takeaways": ["Keep a steady wake-up time."], "reflectionQuestion": "When do you wake up?", "words": 900, "readingMinutes": 5}'::jsonb,
    '[{"idx": 1, "url": "https://example.org/sleep", "title": "Sleep"}]');
end $$;

create function lmu_test.deck_json() returns jsonb language sql immutable as $$
  select '{"story": [{"kicker": "The story", "text": "You wake up tired."}], "systemNote": null, "lesson": "Sleep in cycles.", "tryToday": "Wake at one time."}'::jsonb
$$;

create function lmu_test.test_decks_due() returns setof text language plpgsql as $$
declare
  daily text := lmu_test.deck_article('Decks daily', false);
  green text := lmu_test.deck_article('Decks evergreen', true);
  gone text := lmu_test.deck_article('Decks rejected', false);
  due text[];
begin
  update levelmeup.articles set status = 'rejected' where id = gone;
  return next is((select array[deck_attempts::text, coalesce(deck::text, 'null')] from levelmeup.articles where id = daily), array['0', 'null'],
    'a new article has no deck and no try yet');
  select array_agg(d.id order by d.id) into due from levelmeup.article_decks_due(1000) d where d.id in (daily, green, gone);
  return next is(due, array[daily, green], 'published and waiting articles are due; a rejected one is not');
  return next is((select d.excerpts from levelmeup.article_decks_due(1000) d where d.id = daily), '["An excerpt from a page."]'::jsonb,
    'each comes with its brief''s excerpts, for the copying check');
  return next is((select count(*)::int from levelmeup.article_decks_due(0)), 0, 'a limit of none gives none');
end $$;

create function lmu_test.test_deck_tries() returns setof text language plpgsql as $$
declare
  a text := lmu_test.deck_article('Decks kept', false);
  b text := lmu_test.deck_article('Decks refused', false);
begin
  return next is((select d.attempts from levelmeup.article_decks_due(1000) d where d.id = a), 0, 'each due article comes with its tries so far');
  return next ok(levelmeup.article_claim_deck(a, 0), 'a try is taken before the call');
  return next ok(not levelmeup.article_claim_deck(a, 0), 'and only once: another tick that saw the same count can''t take it too');
  return next is((select deck_attempts from levelmeup.articles where id = a), 1, 'one try used');
  return next ok(levelmeup.article_set_deck(a, lmu_test.deck_json(), null), 'a checked deck is stored');
  return next is((select array[deck ->> 'lesson', deck_attempts::text] from levelmeup.articles where id = a), array['Sleep in cycles.', '1'],
    'the deck reads back; storing it takes no other try');
  return next ok(not levelmeup.article_set_deck(a, lmu_test.deck_json(), null), 'a deck once stored is kept');
  return next ok(not exists (select 1 from levelmeup.article_decks_due(1000) d where d.id = a), 'an article with a deck is no longer due');
  return next ok(not levelmeup.article_claim_deck(a, 1), 'and no try is taken for it');

  perform levelmeup.article_claim_deck(b, 0);
  return next ok(levelmeup.article_set_deck(b, null, 'the number 66 is not in the article'), 'a refused try is kept with its reason');
  return next is((select array[deck_attempts::text, deck_error] from levelmeup.articles where id = b), array['1', 'the number 66 is not in the article'],
    'one try used');
  return next ok(exists (select 1 from levelmeup.article_decks_due(1000) d where d.id = b and d.attempts = 1), 'it is due once more');
  return next ok(levelmeup.article_claim_deck(b, 1), 'its second try is taken');
  return next ok(not exists (select 1 from levelmeup.article_decks_due(1000) d where d.id = b),
    'after two tries it is left to the full article, even if the second never answered');
  return next ok(not levelmeup.article_claim_deck(b, 2), 'and no third try is taken');
end $$;

create function lmu_test.test_deck_guard() returns setof text language plpgsql as $$
declare
  a text := lmu_test.deck_article('Decks guarded', false);
begin
  return next throws_ok(format($q$ select levelmeup.article_set_deck(%L, '"a string"'::jsonb, null) $q$, a), '23514', null,
    'a deck must be an object');
  return next throws_ok(format($q$ select levelmeup.article_set_deck(%L, '{"story": "cards"}'::jsonb, null) $q$, a), '23514', null,
    'its story must be a list');
end $$;

create function lmu_test.test_deck_privileges() returns setof text language plpgsql as $$
begin
  return next ok(has_function_privilege('lmu_service', 'levelmeup.article_decks_due(int)', 'execute'), 'the service lists due decks');
  return next ok(has_function_privilege('lmu_service', 'levelmeup.article_claim_deck(text, int)', 'execute'), 'the service takes a try');
  return next ok(has_function_privilege('lmu_service', 'levelmeup.article_set_deck(text, jsonb, text)', 'execute'), 'the service stores them');
  return next ok(not has_function_privilege('lmu_player', 'levelmeup.article_set_deck(text, jsonb, text)', 'execute'), 'players can''t');
  return next ok(not has_function_privilege('lmu_player', 'levelmeup.article_claim_deck(text, int)', 'execute'), 'nor take a try');
  return next ok(not has_function_privilege('anon', 'levelmeup.article_decks_due(int)', 'execute'), 'nor can anyone else');
end $$;

-- Monster Buddy (migration 0021): a stored deck gets its clay picture at the article's own path; nothing else changes.
create function lmu_test.test_deck_picture() returns setof text language plpgsql as $$
declare
  a text := lmu_test.deck_article('Decks pictured', false);
  b text := lmu_test.deck_article('Decks without a deck', false);
begin
  perform levelmeup.article_set_deck(a, lmu_test.deck_json(), null);
  return next ok(levelmeup.article_set_picture(a, 'story-clay/' || a || '.webp'), 'a stored deck gets its picture');
  return next is((select array[deck ->> 'picture', deck ->> 'lesson'] from levelmeup.articles where id = a),
    array['story-clay/' || a || '.webp', 'Sleep in cycles.'], 'the deck names it and keeps its story');
  return next ok(levelmeup.article_set_picture(a, 'story-clay/' || a || '.webp'), 'setting it again is harmless');
  return next ok(not levelmeup.article_set_picture(b, 'story-clay/' || b || '.webp'), 'an article without a deck gets none');
  return next is((select deck from levelmeup.articles where id = b), null::jsonb, 'and stays without one');
  return next throws_ok(format($q$ select levelmeup.article_set_picture(%L, %L) $q$, a, 'story-clay/article-1.webp'), '22023', null,
    'only the article''s own path');
  return next throws_ok(format($q$ select levelmeup.article_set_picture(%L, %L) $q$, a, 'story-v1/' || a || '.webp'), '22023', null,
    'only in the clay folder');
  return next ok(has_function_privilege('lmu_service', 'levelmeup.article_set_picture(text, text)', 'execute'), 'the service sets it');
  return next ok(not has_function_privilege('lmu_player', 'levelmeup.article_set_picture(text, text)', 'execute'), 'players can''t');
  return next ok(not has_function_privilege('anon', 'levelmeup.article_set_picture(text, text)', 'execute'), 'nor can anyone else');
end $$;
