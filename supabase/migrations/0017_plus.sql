-- M13: LevelMeUp Plus (plan docs/superpowers/plans/2026-10-18-m13-plus.md). Applied by `npm run db:deploy`.
--
-- 1. One row per grant: the beta's Founder grant (Plus for life, given by the owner) or a Google Play purchase, as
--    RevenueCat reports it to lmu-plus. The phone never writes it; the server reads it into state.plus.
-- 2. delete_player removes the grants with the character.

create table levelmeup.entitlements (
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null check (source in ('beta_founder', 'play')),
  product text check (product in ('plus_monthly', 'plus_yearly', 'plus_lifetime')),
  starts_at timestamptz not null default now(),
  -- Null: no end (Lifetime, the Founder grant).
  ends_at timestamptz,
  -- The current period is the free trial.
  trial boolean not null default false,
  -- Null when there is nothing to renew; false once cancelled (the period still runs to ends_at).
  will_renew boolean,
  manage_url text check (manage_url is null or (char_length(manage_url) <= 500 and manage_url like 'https://%')),
  checked_at timestamptz not null default now(),
  primary key (user_id, source),
  check ((source = 'play') = (product is not null))
);

alter table levelmeup.entitlements enable row level security;
create policy "players read their own entitlements" on levelmeup.entitlements for select to lmu_player
  using (user_id = (select levelmeup.player_id()));
grant select on levelmeup.entitlements to lmu_player;

-- What RevenueCat said about the player's Play purchase. A null product: RevenueCat knows no Plus purchase now (a refund,
-- a revoke), so a stored Play row ends at once.
create function levelmeup.set_play_plus(p_user uuid, p_product text, p_ends_at timestamptz, p_trial boolean, p_will_renew boolean,
  p_manage_url text)
returns void language plpgsql security definer set search_path = levelmeup, pg_temp as $$
begin
  if not exists (select 1 from levelmeup.profiles where user_id = p_user) then raise exception 'lmu:not_started'; end if;
  if p_product is null then
    update levelmeup.entitlements
    set ends_at = least(coalesce(ends_at, now()), now()), trial = false, will_renew = false, checked_at = now()
    where user_id = p_user and source = 'play';
    return;
  end if;
  insert into levelmeup.entitlements (user_id, source, product, ends_at, trial, will_renew, manage_url)
  values (p_user, 'play', p_product, p_ends_at, coalesce(p_trial, false), p_will_renew, p_manage_url)
  on conflict (user_id, source) do update set
    product = excluded.product, ends_at = excluded.ends_at, trial = excluded.trial, will_renew = excluded.will_renew,
    manage_url = excluded.manage_url, checked_at = now();
end $$;

-- The beta's Founder grant: Plus for life to a closed-test player, found by the Google email their character is saved
-- with (never a guest). Only the owner runs it (`npm run plus -- founder <email>`, their yes each time), as the database
-- owner, so it is no entry point: lmu_service can't run it. Returns the player, or null when no saved character has
-- that email.
create function levelmeup.grant_founder(p_email text)
returns uuid language plpgsql set search_path = levelmeup, pg_temp as $$
declare
  me uuid;
begin
  select u.id into me from auth.users u join levelmeup.profiles p on p.user_id = u.id
  where lower(u.email) = lower(trim(p_email)) and not coalesce(u.is_anonymous, false);
  if me is null then return null; end if;
  insert into levelmeup.entitlements (user_id, source) values (me, 'beta_founder')
  on conflict (user_id, source) do update set ends_at = null, checked_at = now();
  return me;
end $$;

create or replace function levelmeup.delete_player(p_user uuid)
returns jsonb language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  counts jsonb := '{}';
  n int;
begin
  -- Wait for any write in flight, so nothing is added after the deletes below.
  perform 1 from levelmeup.character_state where user_id = p_user for update;
  delete from levelmeup.achievements_earned where user_id = p_user; get diagnostics n = row_count; counts := counts || jsonb_build_object('achievements', n);
  delete from levelmeup.checkins where user_id = p_user; get diagnostics n = row_count; counts := counts || jsonb_build_object('checkins', n);
  delete from levelmeup.events where user_id = p_user; get diagnostics n = row_count; counts := counts || jsonb_build_object('events', n);
  delete from levelmeup.xp_ledger where user_id = p_user; get diagnostics n = row_count; counts := counts || jsonb_build_object('ledger', n);
  delete from levelmeup.quest_instances where user_id = p_user; get diagnostics n = row_count; counts := counts || jsonb_build_object('quests', n);
  delete from levelmeup.quest_days where user_id = p_user; get diagnostics n = row_count; counts := counts || jsonb_build_object('days', n);
  delete from levelmeup.ladder_states where user_id = p_user; get diagnostics n = row_count; counts := counts || jsonb_build_object('ladders', n);
  delete from levelmeup.entitlements where user_id = p_user; get diagnostics n = row_count; counts := counts || jsonb_build_object('plus', n);
  delete from levelmeup.character_state where user_id = p_user; get diagnostics n = row_count; counts := counts || jsonb_build_object('character', n);
  delete from levelmeup.profiles where user_id = p_user; get diagnostics n = row_count; counts := counts || jsonb_build_object('profile', n);
  update levelmeup.ai_generations set user_id = null where user_id = p_user;
  return counts;
end $$;

revoke all on all functions in schema levelmeup from public, anon, authenticated;
grant execute on function levelmeup.set_play_plus(uuid, text, timestamptz, boolean, boolean, text) to lmu_service;
