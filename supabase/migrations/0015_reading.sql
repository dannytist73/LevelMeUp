-- M8b: reading (plan 2026-10-13-m8b-reading.md, decision 9). A day's article is a published one; the reading quest is
-- claimed only on a day that has one and counts towards "articles read"; the Mage's Insight; reserve_ai_call goes.

-- Unused since M8a: reserve_ai_spend took its place (roadmap, "Carried forward from M8a").
drop function levelmeup.reserve_ai_call(uuid, text, text, int);

-- Every value is null before M8b, so the key holds at once. Articles are never deleted, only decided.
alter table levelmeup.quest_days
  add constraint quest_days_article_id_fkey foreign key (article_id) references levelmeup.articles (id) on delete set null;
-- "Unread" is per player: the day's chooser and M8a's demand check (article_short_players) read it.
create index quest_days_article_idx on levelmeup.quest_days (user_id, article_id) where article_id is not null;

-- Insight (decision 8): the topic chosen on a quest day, for the next day built.
alter table levelmeup.character_state add column insight jsonb
  check (insight is null or (jsonb_typeof(insight -> 'cluster') = 'string' and jsonb_typeof(insight -> 'day') = 'number'));

-- 0003's insert_day, keeping the article only while it is published: the server picks published articles anyway, and
-- the shared library never reaches a day unchecked.
create or replace function levelmeup.insert_day(p_user uuid, p_day jsonb) returns bigint language plpgsql set search_path = levelmeup, pg_temp as $$
declare
  day bigint;
begin
  insert into levelmeup.quest_days (user_id, day_number, starts_at, ends_at, time_zone, budget, light, comeback, hard_day, article_id, protection, content_version)
  select p_user, d."dayNumber", d."startsAt", d."endsAt", d."timeZone", d.budget, d.light, coalesce(d.comeback, false), false,
    (select a.id from levelmeup.articles a where a.id = d."articleId" and a.status = 'published'), d.protection, d."contentVersion"
  from jsonb_to_record(p_day) as d("dayNumber" int, "startsAt" timestamptz, "endsAt" timestamptz, "timeZone" text, budget smallint,
    light boolean, comeback boolean, "articleId" text, protection text, "contentVersion" int)
  returning id into day;

  insert into levelmeup.quest_instances (day_id, user_id, slot, template_id, ladder_id, rung, stat, tier, minutes, completion, condition, hard_day, xp, why, book)
  select day, p_user, q.slot, q."templateId", q.ladder, q.rung, q.stat, q.tier, q.minutes, q.completion, q.condition, coalesce(q."hardDay", false), q.xp, q.why, q.book
  from jsonb_to_recordset(coalesce(p_day -> 'quests', '[]')) as q(slot text, "templateId" text, ladder text, rung smallint, stat text, tier text,
    minutes smallint, completion text, condition jsonb, "hardDay" boolean, xp jsonb, why jsonb, book text);
  return day;
end $$;

-- 0004's complete_quest. M8b (decision 6): the reading quest needs the day's article, and counts as an article read.
create or replace function levelmeup.complete_quest(p_user uuid, p_event uuid, p_instance bigint, p_completed_at timestamptz, p_rating text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  stored jsonb;
  q levelmeup.quest_instances;
  d levelmeup.quest_days;
  v int;
  total int;
  outcome jsonb;
begin
  perform levelmeup.lock_player(p_user);
  stored := levelmeup.stored_event(p_user, p_event, 'complete', p_instance);
  if stored is not null then return stored; end if;

  select * into q from levelmeup.quest_instances where id = p_instance and user_id = p_user;
  if not found then raise exception 'lmu:not_found'; end if;
  select * into d from levelmeup.quest_days where id = q.day_id;
  if q.completed_at is not null then raise exception 'lmu:already_completed'; end if;
  if d.status <> 'open' then raise exception 'lmu:day_closed'; end if;
  if p_completed_at < d.starts_at or p_completed_at >= d.ends_at then raise exception 'lmu:outside_day'; end if;
  if p_completed_at > now() + interval '5 minutes' then raise exception 'lmu:future'; end if;
  if now() > d.ends_at + interval '48 hours' then raise exception 'lmu:too_late'; end if;
  if p_rating is not null and p_rating not in ('easy', 'right', 'too_hard') then raise exception 'lmu:bad_rating'; end if;
  if q.slot = 'article' and d.article_id is null then raise exception 'lmu:no_article'; end if;

  update levelmeup.quest_instances
  set completed_at = p_completed_at, completion_event = p_event, rating = p_rating, payload = p_payload
  where id = q.id;
  insert into levelmeup.xp_ledger (user_id, source_type, source_id, stat, amount, instance_id)
  select p_user, 'quest', p_event::text, x.key, x.value::int, q.id from jsonb_each_text(q.xp) x;
  perform levelmeup.add_xp(p_user, q.xp, 1);
  update levelmeup.character_state
  set quests_cleared = quests_cleared + 1, articles_read = articles_read + (q.slot = 'article')::int
  where user_id = p_user;
  v := levelmeup.bump(p_user);
  select total_xp into total from levelmeup.character_state where user_id = p_user;

  outcome := jsonb_build_object('instanceId', q.id, 'xp', q.xp, 'totalXp', total, 'version', v);
  insert into levelmeup.events (user_id, client_event_id, type, payload, result)
  values (p_user, p_event, 'complete',
    jsonb_build_object('instanceId', q.id, 'completedAt', p_completed_at, 'rating', p_rating, 'payload', p_payload), outcome);
  return outcome;
end $$;

-- 0004's undo_quest. M8b: an undone reading is no longer an article read.
create or replace function levelmeup.undo_quest(p_user uuid, p_event uuid, p_instance bigint)
returns jsonb language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  stored jsonb;
  q levelmeup.quest_instances;
  d levelmeup.quest_days;
  v int;
  total int;
  outcome jsonb;
begin
  perform levelmeup.lock_player(p_user);
  stored := levelmeup.stored_event(p_user, p_event, 'undo', p_instance);
  if stored is not null then return stored; end if;

  select * into q from levelmeup.quest_instances where id = p_instance and user_id = p_user;
  if not found then raise exception 'lmu:not_found'; end if;
  select * into d from levelmeup.quest_days where id = q.day_id;
  if q.completed_at is null then raise exception 'lmu:not_completed'; end if;
  if d.status <> 'open' or now() >= d.ends_at then raise exception 'lmu:day_closed'; end if;

  insert into levelmeup.xp_ledger (user_id, source_type, source_id, stat, amount, instance_id)
  select p_user, 'undo', p_event::text, x.key, -(x.value::int), q.id from jsonb_each_text(q.xp) x;
  perform levelmeup.add_xp(p_user, q.xp, -1);
  update levelmeup.quest_instances set completed_at = null, completion_event = null, rating = null, payload = null where id = q.id;
  update levelmeup.character_state
  set quests_cleared = quests_cleared - 1, articles_read = greatest(articles_read - (q.slot = 'article')::int, 0)
  where user_id = p_user;
  v := levelmeup.bump(p_user);
  select total_xp into total from levelmeup.character_state where user_id = p_user;

  outcome := jsonb_build_object('instanceId', q.id, 'totalXp', total, 'version', v);
  insert into levelmeup.events (user_id, client_event_id, type, payload, result)
  values (p_user, p_event, 'undo', jsonb_build_object('instanceId', q.id), outcome);
  return outcome;
end $$;

-- Insight (decision 8): the topic for the next day built, chosen on an open day. lmu-sync has checked the class, the
-- level and that the topic holds an unread article; this keeps the event once, the day open and the topic one of eight.
create function levelmeup.set_insight(p_user uuid, p_event uuid, p_cluster text, p_day int)
returns jsonb language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  stored jsonb;
  d levelmeup.quest_days;
  v int;
  outcome jsonb;
begin
  perform levelmeup.lock_player(p_user);
  stored := levelmeup.stored_event(p_user, p_event, 'insight', null);
  if stored is not null then return stored; end if;
  if p_cluster is null
    or p_cluster not in ('habits', 'psychology', 'movement', 'sleep', 'focus', 'learning', 'philosophy', 'history') then
    raise exception 'lmu:bad_change';
  end if;
  select * into d from levelmeup.quest_days where user_id = p_user and day_number = p_day;
  if not found or d.status <> 'open' or now() >= d.ends_at then raise exception 'lmu:day_closed'; end if;

  update levelmeup.character_state set insight = jsonb_build_object('cluster', p_cluster, 'day', p_day) where user_id = p_user;
  v := levelmeup.bump(p_user);
  outcome := jsonb_build_object('cluster', p_cluster, 'day', p_day, 'version', v);
  insert into levelmeup.events (user_id, client_event_id, type, payload, result)
  values (p_user, p_event, 'insight', jsonb_build_object('cluster', p_cluster, 'day', p_day), outcome);
  return outcome;
end $$;

revoke all on all functions in schema levelmeup from public, anon, authenticated;
grant execute on function levelmeup.set_insight(uuid, uuid, text, int) to lmu_service;
