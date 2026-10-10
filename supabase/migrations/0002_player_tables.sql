-- Player data (architecture §3). Players read their own rows; nobody writes directly: every write goes through the
-- security definer functions in 0003, called by lmu_service from the Edge Functions. The schema is not exposed
-- through the Data API, so the read grants below are used only by lmu_service acting as the player.

create table levelmeup.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  voice text not null check (voice in ('mentor', 'system', 'questmaster')),
  class_id text not null check (class_id in ('warrior', 'mage', 'rogue', 'monk')),
  class_changed_at timestamptz,
  time_zone text not null check (char_length(time_zone) between 1 and 64),
  boundary_minutes int not null default 240 check (boundary_minutes between 0 and 1439),
  minutes_per_day int not null check (minutes_per_day in (10, 15, 25, 40)),
  difficulty text not null check (difficulty in ('gentle', 'steady', 'hard')),
  goals text[] not null check (
    cardinality(goals) between 1 and 2
    and goals <@ array['body', 'energy', 'learn', 'focus', 'routine']
    and (cardinality(goals) = 1 or goals[1] <> goals[2])
  ),
  limitations text[] not null default '{}' check (limitations <@ array['knee', 'back', 'shoulder', 'wrist']),
  gentle_start boolean not null default false,
  own_program boolean not null default false,
  book text check (char_length(book) between 1 and 120),
  reveal jsonb not null,
  accountability_level smallint not null default 0 check (accountability_level between 0 and 2),
  accountability_enabled_at timestamptz,
  created_at timestamptz not null default now()
);

-- Stat XP and start points only: level, stat points and ranks are computed by the rules when read, so no cached
-- number can drift. `version` rises with every write; closing days checks it (optimistic concurrency).
create table levelmeup.character_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  start_strength smallint not null check (start_strength between 3 and 10),
  start_vitality smallint not null check (start_vitality between 3 and 10),
  start_wisdom smallint not null check (start_wisdom between 3 and 10),
  start_focus smallint not null check (start_focus between 3 and 10),
  start_discipline smallint not null check (start_discipline between 3 and 10),
  xp_strength int not null default 0 check (xp_strength >= 0),
  xp_vitality int not null default 0 check (xp_vitality >= 0),
  xp_wisdom int not null default 0 check (xp_wisdom >= 0),
  xp_focus int not null default 0 check (xp_focus >= 0),
  xp_discipline int not null default 0 check (xp_discipline >= 0),
  total_xp int generated always as (xp_strength + xp_vitality + xp_wisdom + xp_focus + xp_discipline) stored,
  streak_current int not null default 0 check (streak_current >= 0),
  streak_best int not null default 0 check (streak_best >= streak_current),
  shields smallint not null default 0 check (shields between 0 and 2),
  awaiting_checkin boolean not null default false,
  quests_cleared int not null default 0 check (quests_cleared >= 0),
  hard_days_cleared int not null default 0 check (hard_days_cleared >= 0),
  comebacks int not null default 0 check (comebacks >= 0),
  recoveries_cleared int not null default 0 check (recoveries_cleared >= 0),
  articles_read int not null default 0 check (articles_read >= 0),
  ability_last_used jsonb not null default '{}' check (jsonb_typeof(ability_last_used) = 'object'),
  version int not null default 0,
  updated_at timestamptz not null default now()
);

create table levelmeup.ladder_states (
  user_id uuid not null references auth.users (id) on delete cascade,
  ladder_id text not null check (char_length(ladder_id) between 1 and 64),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (user_id, ladder_id)
);

create table levelmeup.quest_days (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  day_number int not null check (day_number >= 1),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  time_zone text not null check (char_length(time_zone) between 1 and 64),
  budget smallint not null check (budget between 1 and 60),
  light boolean not null,
  comeback boolean not null default false,
  hard_day boolean not null default false,
  article_id text,
  protection text check (protection in ('planned_rest', 'outage', 'no_quests')),
  status text not null default 'open' check (status in ('open', 'closed')),
  resolution text check (resolution in ('streak_day', 'protected', 'awaiting_checkin')),
  streak_applied boolean not null default false,
  content_version int not null check (content_version >= 1),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check ((status = 'open') = (resolution is null and closed_at is null)),
  unique (user_id, day_number),
  unique (id, user_id)
);

create table levelmeup.quest_instances (
  id bigint generated always as identity primary key,
  day_id bigint not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  slot text not null check (slot in ('core', 'side1', 'side2', 'article', 'recovery')),
  template_id text not null check (char_length(template_id) between 1 and 64),
  ladder_id text,
  rung smallint check (rung >= 0),
  stat text not null check (stat in ('strength', 'vitality', 'wisdom', 'focus', 'discipline')),
  tier text not null check (tier in ('minor', 'standard', 'major')),
  minutes smallint not null check (minutes between 0 and 120),
  completion text not null check (completion in ('tap', 'timer', 'reps', 'text')),
  condition jsonb not null check (jsonb_typeof(condition) = 'object'),
  hard_day boolean not null default false,
  xp jsonb not null check (jsonb_typeof(xp) = 'object'),
  why jsonb not null check (jsonb_typeof(why) = 'object'),
  book text,
  completed_at timestamptz,
  completion_event uuid,
  rating text check (rating in ('easy', 'right', 'too_hard')),
  payload jsonb,
  check ((completed_at is null) = (completion_event is null)),
  check (completed_at is not null or (rating is null and payload is null)),
  unique (day_id, slot),
  foreign key (day_id, user_id) references levelmeup.quest_days (id, user_id) on delete cascade
);
create index quest_instances_user_idx on levelmeup.quest_instances (user_id);

-- Every XP change. Quest awards and undos are keyed by their event, so a quest can be completed, undone and completed
-- again; rung bonuses are keyed by ladder and rung, so each is paid once ever.
create table levelmeup.xp_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  source_type text not null check (source_type in ('quest', 'undo', 'rung', 'discipline', 'milestone')),
  source_id text not null check (char_length(source_id) between 1 and 100),
  stat text not null check (stat in ('strength', 'vitality', 'wisdom', 'focus', 'discipline')),
  amount int not null check (amount <> 0),
  instance_id bigint,
  created_at timestamptz not null default now(),
  unique (user_id, source_type, source_id, stat)
);

-- Applied phone events, so a repeated client_event_id returns the stored result and changes nothing.
create table levelmeup.events (
  user_id uuid not null references auth.users (id) on delete cascade,
  client_event_id uuid not null,
  type text not null check (char_length(type) between 1 and 40),
  payload jsonb not null,
  result jsonb not null,
  applied_at timestamptz not null default now(),
  primary key (user_id, client_event_id)
);

-- A pending or answered check-in: one missed day, or a run of away days (no day row).
create table levelmeup.checkins (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  day_id bigint,
  gap_from int check (gap_from >= 1),
  gap_to int,
  answer text check (answer in ('sick', 'injured', 'emergency', 'too_hard', 'lighter_load', 'just_didnt')),
  note text check (char_length(note) <= 500),
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  check ((day_id is not null) <> (gap_from is not null)),
  check (gap_from is null or gap_to >= gap_from),
  check ((answer is null) = (answered_at is null)),
  foreign key (day_id, user_id) references levelmeup.quest_days (id, user_id) on delete cascade
);
create index checkins_user_idx on levelmeup.checkins (user_id);

create table levelmeup.achievements_earned (
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id text not null check (char_length(achievement_id) between 1 and 64),
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- Every Claude call (cost tracking and the per-player caps). Server only: players never read it.
create table levelmeup.ai_generations (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('onboarding', 'article')),
  model text not null,
  status text not null check (status in ('pending', 'ok', 'failed', 'fallback')),
  input_tokens int check (input_tokens >= 0),
  output_tokens int check (output_tokens >= 0),
  cost_usd numeric(10, 6) check (cost_usd >= 0),
  error text check (char_length(error) <= 1000),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index ai_generations_user_kind_idx on levelmeup.ai_generations (user_id, kind);

alter table levelmeup.profiles enable row level security;
alter table levelmeup.character_state enable row level security;
alter table levelmeup.ladder_states enable row level security;
alter table levelmeup.quest_days enable row level security;
alter table levelmeup.quest_instances enable row level security;
alter table levelmeup.xp_ledger enable row level security;
alter table levelmeup.events enable row level security;
alter table levelmeup.checkins enable row level security;
alter table levelmeup.achievements_earned enable row level security;
alter table levelmeup.ai_generations enable row level security;

create policy "players read their own profile" on levelmeup.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy "players read their own character" on levelmeup.character_state for select to authenticated using (user_id = (select auth.uid()));
create policy "players read their own ladders" on levelmeup.ladder_states for select to authenticated using (user_id = (select auth.uid()));
create policy "players read their own days" on levelmeup.quest_days for select to authenticated using (user_id = (select auth.uid()));
create policy "players read their own quests" on levelmeup.quest_instances for select to authenticated using (user_id = (select auth.uid()));
create policy "players read their own XP" on levelmeup.xp_ledger for select to authenticated using (user_id = (select auth.uid()));
create policy "players read their own events" on levelmeup.events for select to authenticated using (user_id = (select auth.uid()));
create policy "players read their own check-ins" on levelmeup.checkins for select to authenticated using (user_id = (select auth.uid()));
create policy "players read their own achievements" on levelmeup.achievements_earned for select to authenticated using (user_id = (select auth.uid()));

grant select on levelmeup.profiles, levelmeup.character_state, levelmeup.ladder_states, levelmeup.quest_days,
  levelmeup.quest_instances, levelmeup.xp_ledger, levelmeup.events, levelmeup.checkins, levelmeup.achievements_earned
  to authenticated;
