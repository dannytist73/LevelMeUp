-- M11: the Story Deck (plan 2026-10-18-m11-lantern-story-deck.md, decisions 4–5). Each article gets a deck of short
-- cards, written by the tick from the stored article and checked by the pipeline's code; the constraint is the last
-- guard. A deck that fails twice is left out, and the phone shows the full article. Players read it with the article
-- (the "players read published articles" policy covers every column).

alter table levelmeup.articles
  add column deck jsonb check (deck is null or (jsonb_typeof(deck) = 'object' and jsonb_typeof(deck -> 'story') = 'array')),
  add column deck_attempts int not null default 0 check (deck_attempts between 0 and 2),
  add column deck_error text check (char_length(deck_error) <= 1000);

-- Articles waiting for a deck: published or held for review, no deck, fewer than two tries; the newest first, since
-- tonight's article reaches players first. Each with its tries so far (the claim below), its job (the budget's row) and
-- its brief's excerpts (the copying check; a job's brief stays once its article is stored).
create function levelmeup.article_decks_due(p_limit int)
returns table (id text, job_id bigint, attempts int, title text, summary text, sections jsonb, takeaways jsonb, reflection_question text, excerpts jsonb)
language sql stable security definer set search_path = levelmeup, pg_temp as $$
  select a.id, a.job_id, a.deck_attempts, a.title, a.summary, a.sections, a.takeaways, a.reflection_question,
    coalesce(j.brief -> 'excerpts', '[]'::jsonb)
  from levelmeup.articles a join levelmeup.article_jobs j on j.id = a.job_id
  where a.deck is null and a.deck_attempts < 2 and a.status in ('published', 'review')
  order by coalesce(a.published_at, a.created_at) desc, a.id
  limit greatest(p_limit, 0)
$$;

-- A try is taken before Claude is called, from the count this tick saw: a tick that dies after the call can't have the
-- article called again for free, and two ticks can't both take the same try (M11 review).
create function levelmeup.article_claim_deck(p_id text, p_attempts int) returns boolean
language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  n int;
begin
  update levelmeup.articles set deck_attempts = p_attempts + 1
  where id = p_id and deck is null and deck_attempts = p_attempts and p_attempts < 2;
  get diagnostics n = row_count;
  return n = 1;
end $$;

-- What a try gave: the checked deck, or why there is none. A deck once stored is kept.
create function levelmeup.article_set_deck(p_id text, p_deck jsonb, p_error text) returns boolean
language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  n int;
begin
  update levelmeup.articles set
    deck = p_deck,
    deck_error = case when p_deck is null then left(p_error, 1000) else null end
  where id = p_id and deck is null;
  get diagnostics n = row_count;
  return n = 1;
end $$;

revoke all on all functions in schema levelmeup from public, anon, authenticated;
grant execute on function levelmeup.article_decks_due(int) to lmu_service;
grant execute on function levelmeup.article_claim_deck(text, int) to lmu_service;
grant execute on function levelmeup.article_set_deck(text, jsonb, text) to lmu_service;
