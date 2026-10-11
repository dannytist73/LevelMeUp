// Postgres access for the Edge Functions, as lmu_service (LMU_DB_URL, transaction pooler). Reads run as the player
// (role lmu_player with their claims) so row level security decides; writes call the levelmeup functions. lmu_player
// can read LevelMeUp's tables and nothing else, so no claims can reach the wedding's data (migration 0004).
import postgres from 'npm:postgres@3.4.9';
import { PAIN_WINDOW_MS } from '../../../packages/rules/src/index.ts';
import type { CharacterRow, CheckinRow, DayRow, InstanceRow, LadderRow, ProfileRow, Snapshot } from './state.ts';

export type Sql = postgres.Sql;
export type Tx = postgres.TransactionSql;

let client: Sql | null = null;

export function db(): Sql {
  if (client === null) {
    const url = Deno.env.get('LMU_DB_URL');
    if (!url) throw new Error('LMU_DB_URL is not set');
    client = postgres(url, { prepare: false, max: 3, idle_timeout: 20, connect_timeout: 10 });
  }
  return client;
}

/** The single row a `select levelmeup.<function>(…)` returns. */
export function one<T>(rows: readonly T[]): T {
  const row = rows[0];
  if (row === undefined) throw new Error('expected one row');
  return row;
}

/** The `lmu:<code>` a levelmeup function raised, or null for any other error. */
export function lmuCode(error: unknown): string | null {
  const message = error instanceof Error ? error.message : '';
  const match = /^lmu:([a-z_]+)$/.exec(message);
  return match ? match[1]! : null;
}

export async function asPlayer(tx: Tx, userId: string): Promise<void> {
  await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId })}, true)`;
  await tx`set local role lmu_player`;
}

export async function asService(tx: Tx): Promise<void> {
  await tx`reset role`;
}

/** Everything the server needs about a player, read as that player. Null before onboarding. */
export async function loadSnapshot(tx: Tx, userId: string): Promise<Snapshot | null> {
  await asPlayer(tx, userId);
  try {
    const [profile] = await tx<ProfileRow[]>`select * from levelmeup.profiles where user_id = ${userId}`;
    const [character] = await tx<CharacterRow[]>`select * from levelmeup.character_state where user_id = ${userId}`;
    if (profile === undefined || character === undefined) return null;
    const ladders = await tx<LadderRow[]>`select ladder_id, state from levelmeup.ladder_states where user_id = ${userId}`;
    const days = await tx<DayRow[]>`select * from levelmeup.quest_days where user_id = ${userId} order by day_number desc limit 8`;
    const instances = days.length === 0
      ? []
      : await tx<InstanceRow[]>`select * from levelmeup.quest_instances where user_id = ${userId} and day_id in ${tx(days.map((d) => d.id))}`;
    const checkins = await tx<CheckinRow[]>`
      select id, day_id, gap_from, gap_to, answer from levelmeup.checkins where user_id = ${userId} and answer is null order by id`;
    const earned = await tx<{ achievement_id: string }[]>`
      select achievement_id from levelmeup.achievements_earned where user_id = ${userId}`;
    const { queued } = one(await tx<{ queued: boolean }[]>`
      select exists (select 1 from levelmeup.quest_days where user_id = ${userId} and status = 'closed' and not streak_applied) as queued`);
    const { pain } = one(await tx<{ pain: number }[]>`
      select count(*)::int as pain from levelmeup.events
      where user_id = ${userId} and type = 'pain' and applied_at > now() - make_interval(secs => ${PAIN_WINDOW_MS / 1000})`);
    return {
      profile, character, ladders: [...ladders], days: [...days], instances: [...instances], checkins: [...checkins],
      earned: earned.map((r) => r.achievement_id), queued, painReports: pain,
    };
  } finally {
    await asService(tx);
  }
}

/** The player has applied an event or earned XP, so the onboarding can't run again (restart_player's own check). */
export async function hasActed(tx: Tx, userId: string): Promise<boolean> {
  await asPlayer(tx, userId);
  try {
    const { acted } = one(await tx<{ acted: boolean }[]>`
      select exists (select 1 from levelmeup.events where user_id = ${userId})
        or exists (select 1 from levelmeup.xp_ledger where user_id = ${userId}) as acted`);
    return acted;
  } finally {
    await asService(tx);
  }
}
