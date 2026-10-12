-- M8a, the article library (plan decisions 6–9): the nightly pipeline's jobs, the articles it makes and their sources,
-- a lease so one tick runs at a time, and the monthly AI budget ($25, spec §4.1), checked before every Claude call.
-- These tables hold no player data; lmu_service changes them only through the functions below, as everywhere in this
-- schema. Players will read published articles and their sources as lmu_player (M8b).

create table levelmeup.article_pipeline (
  id int primary key default 1 check (id = 1),
  ticking_until timestamptz,
  queued_night date
);
insert into levelmeup.article_pipeline (id) values (1);

create table levelmeup.article_jobs (
  id bigint generated always as identity primary key,
  cluster text not null check (cluster in ('habits', 'psychology', 'movement', 'sleep', 'focus', 'learning', 'philosophy', 'history')),
  topic text not null check (char_length(topic) between 3 and 120),
  evergreen boolean not null default false,
  status text not null default 'queued'
    check (status in ('queued', 'researching', 'researched', 'writing', 'retry', 'done', 'failed')),
  attempt int not null default 1 check (attempt between 1 and 2),
  batch_id text check (char_length(batch_id) <= 100),
  ai_call_id bigint,
  submitted_at timestamptz,
  brief jsonb,
  error text check (char_length(error) <= 1000),
  article_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index article_jobs_open_idx on levelmeup.article_jobs (id) where status not in ('done', 'failed');

create table levelmeup.articles (
  id text primary key check (id ~ '^article-[0-9]+$'),
  job_id bigint not null unique references levelmeup.article_jobs (id),
  cluster text not null,
  topic text not null,
  title text not null check (char_length(title) between 1 and 120),
  summary text not null check (char_length(summary) between 1 and 400),
  sections jsonb not null check (jsonb_typeof(sections) = 'array' and jsonb_array_length(sections) between 1 and 10),
  takeaways jsonb not null check (jsonb_typeof(takeaways) = 'array' and jsonb_array_length(takeaways) between 1 and 6),
  reflection_question text not null check (char_length(reflection_question) between 1 and 300),
  reading_minutes int not null check (reading_minutes between 1 and 15),
  words int not null check (words between 1 and 5000),
  evergreen boolean not null,
  status text not null check (status in ('review', 'published', 'rejected')),
  created_at timestamptz not null default now(),
  published_at timestamptz
);
create index articles_published_idx on levelmeup.articles (cluster) where status = 'published';

create table levelmeup.article_sources (
  article_id text not null references levelmeup.articles (id) on delete cascade,
  idx int not null check (idx between 1 and 50),
  url text not null check (url ~ '^https?://' and char_length(url) <= 2000),
  title text not null check (char_length(title) between 1 and 300),
  primary key (article_id, idx)
);

-- Which job a Claude call belonged to; the month's spend is summed by created_at.
alter table levelmeup.ai_generations add column job_id bigint references levelmeup.article_jobs (id);
create index ai_generations_created_idx on levelmeup.ai_generations (created_at);

alter table levelmeup.article_pipeline enable row level security;
alter table levelmeup.article_jobs enable row level security;
alter table levelmeup.articles enable row level security;
alter table levelmeup.article_sources enable row level security;

create policy "players read published articles" on levelmeup.articles for select to lmu_player using (status = 'published');
create policy "players read the sources of published articles" on levelmeup.article_sources for select to lmu_player
  using (exists (select 1 from levelmeup.articles a where a.id = article_sources.article_id and a.status = 'published'));
grant select on levelmeup.articles, levelmeup.article_sources to lmu_player;

-- This calendar month's spend (UTC): real costs, and the estimates of calls still pending. Internal (reserve_ai_spend).
create function levelmeup.ai_month_spend() returns numeric language sql stable set search_path = levelmeup, pg_temp as $$
  select coalesce(sum(cost_usd), 0) from levelmeup.ai_generations
  where created_at >= date_trunc('month', now() at time zone 'utc') at time zone 'utc'
$$;

-- Spec §4.1: every Claude call is reserved before it is sent, under one lock: refused when its estimate would take the
-- month past p_month_cap (lmu:ai_budget) or, for a player, past their lifetime p_player_cap of calls of that kind
-- (lmu:ai_cap). The row holds the estimate as its cost until finish_ai_call records the real one.
create function levelmeup.reserve_ai_spend(p_user uuid, p_kind text, p_model text, p_estimate numeric, p_month_cap numeric,
  p_player_cap int, p_job bigint)
returns bigint language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  new_id bigint;
begin
  if p_estimate is null or p_estimate < 0 or p_month_cap is null then raise exception 'lmu:bad_budget'; end if;
  perform pg_advisory_xact_lock(hashtextextended('levelmeup:ai_budget', 0));
  if p_player_cap is not null
    and (select count(*) from levelmeup.ai_generations where user_id is not distinct from p_user and kind = p_kind) >= p_player_cap then
    raise exception 'lmu:ai_cap';
  end if;
  if levelmeup.ai_month_spend() + p_estimate > p_month_cap then raise exception 'lmu:ai_budget'; end if;
  insert into levelmeup.ai_generations (user_id, kind, model, status, cost_usd, job_id)
  values (p_user, p_kind, p_model, 'pending', p_estimate, p_job)
  returning ai_generations.id into new_id;
  return new_id;
end $$;

-- One tick at a time: true for the caller that takes the lease. A tick that dies frees it when it lapses.
create function levelmeup.article_tick_begin(p_seconds int) returns boolean language sql security definer
set search_path = levelmeup, pg_temp as $$
  with taken as (
    update levelmeup.article_pipeline set ticking_until = now() + make_interval(secs => p_seconds)
    where id = 1 and (ticking_until is null or ticking_until < now())
    returning 1
  )
  select exists (select 1 from taken)
$$;

create function levelmeup.article_tick_end() returns void language sql security definer set search_path = levelmeup, pg_temp as $$
  update levelmeup.article_pipeline set ticking_until = null where id = 1
$$;

-- The night's jobs are queued once: true for the one call that claims a night later than the last one claimed.
create function levelmeup.article_claim_night(p_night date) returns boolean language sql security definer
set search_path = levelmeup, pg_temp as $$
  with claimed as (
    update levelmeup.article_pipeline set queued_night = p_night
    where id = 1 and (queued_night is null or queued_night < p_night)
    returning 1
  )
  select exists (select 1 from claimed)
$$;

-- Decision 6: players who started a quest day in the last 7 days and have fewer than p_min published articles that no
-- day of theirs has been given.
create function levelmeup.article_short_players(p_min int) returns int language sql stable security definer
set search_path = levelmeup, pg_temp as $$
  select count(*)::int from levelmeup.profiles p
  where exists (select 1 from levelmeup.quest_days d where d.user_id = p.user_id and d.created_at > now() - interval '7 days')
    and (select count(*) from levelmeup.articles a
         where a.status = 'published'
           and not exists (select 1 from levelmeup.quest_days d where d.user_id = p.user_id and d.article_id = a.id)) < p_min
$$;

-- Every topic ever queued, with when it was last queued (the rotation, decision 6).
create function levelmeup.article_topics_used() returns table (cluster text, topic text, queued_at timestamptz)
language sql stable security definer set search_path = levelmeup, pg_temp as $$
  select j.cluster, j.topic, max(j.created_at) from levelmeup.article_jobs j group by j.cluster, j.topic
$$;

-- New jobs from [{cluster, topic, evergreen}]; their ids in order.
create function levelmeup.article_queue(p_jobs jsonb) returns setof bigint language plpgsql security definer
set search_path = levelmeup, pg_temp as $$
begin
  return query
    insert into levelmeup.article_jobs (cluster, topic, evergreen)
    select j.cluster, j.topic, coalesce(j.evergreen, false)
    from jsonb_to_recordset(p_jobs) as j(cluster text, topic text, evergreen boolean)
    returning article_jobs.id;
end $$;

create function levelmeup.article_jobs_open() returns setof levelmeup.article_jobs language sql stable security definer
set search_path = levelmeup, pg_temp as $$
  select * from levelmeup.article_jobs where status not in ('done', 'failed') order by id
$$;

-- Moves a job from the status the pipeline saw to the next one, setting the fields p_set names (attempt, batchId,
-- aiCallId, submittedAt, brief, error; a JSON null clears one). False when another tick moved it first.
create function levelmeup.article_job_move(p_id bigint, p_from text, p_to text, p_set jsonb) returns boolean
language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  n int;
begin
  update levelmeup.article_jobs set
    status = p_to,
    attempt = coalesce((p_set ->> 'attempt')::int, attempt),
    batch_id = case when p_set ? 'batchId' then p_set ->> 'batchId' else batch_id end,
    ai_call_id = case when p_set ? 'aiCallId' then (p_set ->> 'aiCallId')::bigint else ai_call_id end,
    submitted_at = case when p_set ? 'submittedAt' then (p_set ->> 'submittedAt')::timestamptz else submitted_at end,
    brief = case when p_set ? 'brief' then nullif(p_set -> 'brief', 'null'::jsonb) else brief end,
    error = case when p_set ? 'error' then left(p_set ->> 'error', 1000) else error end,
    updated_at = now()
  where id = p_id and status = p_from;
  get diagnostics n = row_count;
  return n = 1;
end $$;

-- A checked article (the pipeline's checks ran; the constraints are the last guard): stored with the sources it cites,
-- published, or held for the owner's review when its job is evergreen (decision 10), and its job done.
create function levelmeup.article_store(p_job bigint, p_article jsonb, p_sources jsonb) returns text
language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  j levelmeup.article_jobs;
  new_id text;
begin
  select * into j from levelmeup.article_jobs where id = p_job for update;
  if not found or j.status <> 'writing' then raise exception 'lmu:conflict'; end if;
  new_id := 'article-' || j.id;
  insert into levelmeup.articles (id, job_id, cluster, topic, title, summary, sections, takeaways, reflection_question,
    reading_minutes, words, evergreen, status, published_at)
  values (new_id, j.id, j.cluster, j.topic, p_article ->> 'title', p_article ->> 'summary', p_article -> 'sections',
    p_article -> 'takeaways', p_article ->> 'reflectionQuestion', (p_article ->> 'readingMinutes')::int,
    (p_article ->> 'words')::int, j.evergreen, case when j.evergreen then 'review' else 'published' end,
    case when j.evergreen then null else now() end);
  insert into levelmeup.article_sources (article_id, idx, url, title)
  select new_id, s.idx, s.url, s.title from jsonb_to_recordset(p_sources) as s(idx int, url text, title text);
  update levelmeup.article_jobs set status = 'done', article_id = new_id, error = null, updated_at = now() where id = p_job;
  return new_id;
end $$;

revoke all on all functions in schema levelmeup from public, anon, authenticated;
grant execute on function levelmeup.reserve_ai_spend(uuid, text, text, numeric, numeric, int, bigint) to lmu_service;
grant execute on function levelmeup.article_tick_begin(int) to lmu_service;
grant execute on function levelmeup.article_tick_end() to lmu_service;
grant execute on function levelmeup.article_claim_night(date) to lmu_service;
grant execute on function levelmeup.article_short_players(int) to lmu_service;
grant execute on function levelmeup.article_topics_used() to lmu_service;
grant execute on function levelmeup.article_queue(jsonb) to lmu_service;
grant execute on function levelmeup.article_jobs_open() to lmu_service;
grant execute on function levelmeup.article_job_move(bigint, text, text, jsonb) to lmu_service;
grant execute on function levelmeup.article_store(bigint, jsonb, jsonb) to lmu_service;
