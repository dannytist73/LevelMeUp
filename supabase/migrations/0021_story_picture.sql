-- Monster Buddy (docs/2026-10-25-monster-buddy.md, decision 7): the story lessons' pictures are painted again in clay, in
-- the public `lmu-art` bucket's `story-clay` folder (the earlier flat set in `story-v1` was retired 2026-10-25). A stored
-- deck keeps its story and gets its new picture here. The studio's door (lmu-articles-studio, action "picture") uploads
-- the picture first, so a deck never names a missing one; the path is always the article's own, and the phone shows a
-- picture from that folder only.
create function levelmeup.article_set_picture(p_id text, p_path text) returns boolean
language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  n int;
begin
  if p_id !~ '^article-[0-9]+$' or p_path is distinct from 'story-clay/' || p_id || '.webp' then
    raise exception 'a story''s picture is story-clay/<its article id>.webp' using errcode = '22023';
  end if;
  update levelmeup.articles set deck = jsonb_set(deck, '{picture}', to_jsonb(p_path))
  where id = p_id and deck is not null;
  get diagnostics n = row_count;
  return n = 1;
end $$;

revoke all on all functions in schema levelmeup from public, anon, authenticated;
grant execute on function levelmeup.article_set_picture(text, text) to lmu_service;
