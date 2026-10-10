-- Helpers shared by every DB test file: scripts/db-test.ts runs this file first inside each file's transaction.
-- Test players use ids 00000000-0000-4000-8000-…, test events 00000000-0000-4000-9000-…

create function lmu_test.uid(p_n int) returns uuid language sql immutable as $$
  select ('00000000-0000-4000-8000-' || lpad(p_n::text, 12, '0'))::uuid
$$;

create function lmu_test.ev(p_n int) returns uuid language sql immutable as $$
  select ('00000000-0000-4000-9000-' || lpad(p_n::text, 12, '0'))::uuid
$$;

-- Runs p_sql as the player (role authenticated with their claims). Null when it worked, else 'SQLSTATE: message'.
-- The role always comes back to postgres: `reset role` on success, the block's rollback on error.
create function lmu_test.try_as(p_user uuid, p_sql text) returns text language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
  execute p_sql;
  reset role;
  return null;
exception when others then
  return sqlstate || ': ' || sqlerrm;
end $$;

create function lmu_test.count_as(p_user uuid, p_sql text) returns bigint language plpgsql as $$
declare
  n bigint;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
  execute format('select count(*) from (%s) q', p_sql) into n;
  reset role;
  return n;
end $$;

create function lmu_test.try_role(p_role text, p_sql text) returns text language plpgsql as $$
begin
  execute format('set local role %I', p_role);
  execute p_sql;
  reset role;
  return null;
exception when others then
  return sqlstate || ': ' || sqlerrm;
end $$;

-- lmu_service's view: grants postgres the role for this transaction only, then runs p_sql as lmu_service.
create function lmu_test.try_service(p_sql text) returns text language plpgsql as $$
begin
  grant lmu_service to postgres with set true, inherit false;
  return lmu_test.try_role('lmu_service', p_sql);
end $$;

-- Day 1's three quests, as _shared/advance.ts drafts them (template ids need not be real here).
create function lmu_test.quests() returns jsonb language sql immutable as $$
  select '[
    {"slot": "core", "templateId": "walk-0", "ladder": "walk", "rung": 0, "stat": "vitality", "tier": "standard", "minutes": 10,
     "completion": "timer", "condition": {"kind": "minutes", "minutes": 10}, "xp": {"vitality": 20}, "why": {"code": "light_day"}},
    {"slot": "side1", "templateId": "read-0", "ladder": "read", "rung": 0, "stat": "wisdom", "tier": "minor", "minutes": 5,
     "completion": "tap", "condition": {"kind": "habit"}, "xp": {"wisdom": 10}, "why": {"code": "balance", "stat": "wisdom"}},
    {"slot": "side2", "templateId": "breathing-0", "ladder": "breathing", "rung": 0, "stat": "focus", "tier": "minor", "minutes": 2,
     "completion": "timer", "condition": {"kind": "minutes", "minutes": 2}, "xp": {"focus": 6, "vitality": 4}, "why": {"code": "goal", "goal": "focus"}}
  ]'::jsonb
$$;

create function lmu_test.day(p_number int, p_starts timestamptz, p_ends timestamptz) returns jsonb language sql stable as $$
  select jsonb_build_object('dayNumber', p_number, 'startsAt', p_starts, 'endsAt', p_ends, 'timeZone', 'Asia/Manila',
    'budget', 25, 'light', p_number = 1, 'contentVersion', 1, 'quests', lmu_test.quests())
$$;

-- A player who finished onboarding, with day 1 running from p_starts to p_ends.
create function lmu_test.start(p_n int, p_starts timestamptz default now() - interval '1 hour',
  p_ends timestamptz default now() + interval '10 hours') returns uuid language plpgsql as $$
declare
  me uuid := lmu_test.uid(p_n);
begin
  insert into auth.users (id, aud, role, is_anonymous) values (me, 'authenticated', 'authenticated', true);
  perform levelmeup.start_player(me,
    '{"name": "Tester", "voice": "system", "classId": "warrior", "timeZone": "Asia/Manila", "boundaryMinutes": 240,
      "minutesPerDay": 25, "difficulty": "steady", "goals": ["body"], "limitations": [], "gentleStart": false,
      "ownProgram": false, "reveal": {}}',
    '{"strength": 9, "vitality": 5, "wisdom": 5, "focus": 5, "discipline": 4}',
    '{"walk": {"rung": 0, "highestRung": 0, "atRung": [], "misses": [], "lastStepUpAt": null, "paused": false}}',
    lmu_test.day(1, p_starts, p_ends));
  return me;
end $$;

-- The player's quest in a slot on their latest day.
create function lmu_test.quest(p_user uuid, p_slot text) returns bigint language sql stable as $$
  select q.id from levelmeup.quest_instances q join levelmeup.quest_days d on d.id = q.day_id
  where q.user_id = p_user and q.slot = p_slot order by d.day_number desc limit 1
$$;

create function lmu_test.version(p_user uuid) returns int language sql stable as $$
  select version from levelmeup.character_state where user_id = p_user
$$;
