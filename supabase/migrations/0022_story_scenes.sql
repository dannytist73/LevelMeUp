-- A picture on every story card (owner, 2026-10-26: "Story pictures + living buddy"): a stored story's deck names one
-- clay picture per card of its story, `story-clay/<article>-<card>.webp` (cards from 1, null for a card without one),
-- and the Grumble the story is about, which the phone shows on the cards after the story. The studio's door
-- (lmu-articles-studio, action "scenes") uploads the pictures first, so a deck never names a missing one; each path is the
-- card's own, and a story of another number of cards gets none.
create function levelmeup.article_set_scenes(p_id text, p_scenes jsonb, p_grumble text) returns boolean
language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  n int;
begin
  if p_id !~ '^article-[0-9]+$' or jsonb_typeof(p_scenes) is distinct from 'array' or jsonb_array_length(p_scenes) = 0
     or p_grumble !~ '^[a-z]{2,24}$' then
    raise exception 'a story''s scenes are an array of its cards'' pictures, and its grumble an id' using errcode = '22023';
  end if;
  for i in 0 .. jsonb_array_length(p_scenes) - 1 loop
    if p_scenes -> i <> 'null'::jsonb and p_scenes -> i is distinct from to_jsonb('story-clay/' || p_id || '-' || (i + 1) || '.webp') then
      raise exception 'card %''s picture is story-clay/<its article id>-%.webp', i + 1, i + 1 using errcode = '22023';
    end if;
  end loop;
  update levelmeup.articles
  set deck = (case when p_grumble is null then deck - 'grumble' else jsonb_set(deck, '{grumble}', to_jsonb(p_grumble)) end)
    || jsonb_build_object('scenes', p_scenes)
  where id = p_id and deck ->> 'v' = '2' and jsonb_array_length(deck -> 'story') = jsonb_array_length(p_scenes);
  get diagnostics n = row_count;
  return n = 1;
end $$;

revoke all on all functions in schema levelmeup from public, anon, authenticated;
grant execute on function levelmeup.article_set_scenes(text, jsonb, text) to lmu_service;
