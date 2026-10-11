-- The reveal's corrections (spec §1.1 beat 9, §5: "Class and assumptions can be corrected on the reveal"): onboarding
-- runs again with the corrected answers. Allowed only while the player has applied no event, so it can never take back
-- anything earned. The Claude-call log (ai_generations) is kept, so the 3-call cap still holds.
create function levelmeup.restart_player(p_user uuid, p_profile jsonb, p_character jsonb, p_ladders jsonb, p_day jsonb)
returns jsonb language plpgsql security definer set search_path = levelmeup, pg_temp as $$
declare
  v int;
begin
  v := levelmeup.lock_player(p_user); -- raises lmu:not_started before onboarding
  if exists (select 1 from levelmeup.events where user_id = p_user)
    or exists (select 1 from levelmeup.xp_ledger where user_id = p_user) then
    raise exception 'lmu:locked';
  end if;
  delete from levelmeup.achievements_earned where user_id = p_user;
  delete from levelmeup.checkins where user_id = p_user;
  delete from levelmeup.quest_instances where user_id = p_user;
  delete from levelmeup.quest_days where user_id = p_user;
  delete from levelmeup.ladder_states where user_id = p_user;
  delete from levelmeup.character_state where user_id = p_user;
  delete from levelmeup.profiles where user_id = p_user;
  perform levelmeup.start_player(p_user, p_profile, p_character, p_ladders, p_day);
  -- The version keeps moving forward, so nothing planned against the first character can match the new one.
  update levelmeup.character_state set version = v + 1 where user_id = p_user;
  return jsonb_build_object('dayId', (select id from levelmeup.quest_days where user_id = p_user and day_number = 1), 'version', v + 1);
end $$;

revoke all on all functions in schema levelmeup from public, anon, authenticated;
grant execute on function levelmeup.restart_player(uuid, jsonb, jsonb, jsonb, jsonb) to lmu_service;
