// Postgres access for the Edge Functions, as lmu_service (LMU_DB_URL, transaction pooler). Reads run as the player
// (role lmu_player with their claims) so row level security decides; writes call the levelmeup functions. lmu_player
// can read LevelMeUp's tables and nothing else, so no claims can reach the wedding's data (migration 0004).
import postgres from 'npm:postgres@3.4.9';
import { LIGHTER_PLAN_WINDOW_MS, PAIN_WINDOW_MS } from '../../../packages/rules/src/index.ts';
import { CALENDAR_DAYS } from './state.ts';
import type {
  AnsweredRow, CalendarRow, CharacterRow, DayRow, History, InstanceRow, LadderRow, PendingCheckin, ProfileRow, QueuedDay, ResultRow, Snapshot,
} from './state.ts';

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
    const earned = await tx<{ achievement_id: string }[]>`
      select achievement_id from levelmeup.achievements_earned where user_id = ${userId} order by earned_at, achievement_id`;
    const [checkin] = await tx<PendingCheckin[]>`
      select c.id, c.day_id, c.gap_from, c.gap_to, c.answer, c.recovery_day_id,
        d.day_number as missed_day, d.starts_at as missed_starts_at, d.ends_at as missed_ends_at, d.time_zone as missed_time_zone,
        q.template_id as missed_core, q.ladder_id as missed_ladder,
        exists (select 1 from levelmeup.quest_instances r
          where r.day_id = c.recovery_day_id and r.slot = 'recovery' and r.completed_at is not null) as recovered
      from levelmeup.checkins c
      left join levelmeup.quest_days d on d.id = c.day_id
      left join levelmeup.quest_instances q on q.day_id = c.day_id and q.slot = 'core'
      where c.user_id = ${userId} and c.resolved_at is null
      order by c.id limit 1`;
    const queue = await tx<QueuedDay[]>`
      select id, day_number, resolution from levelmeup.quest_days
      where user_id = ${userId} and status = 'closed' and not streak_applied order by day_number`;
    const answered = await tx<AnsweredRow[]>`
      select id, answer, answered_at, gap_from, gap_to from levelmeup.checkins
      where user_id = ${userId} and answered_at > now() - make_interval(secs => ${LIGHTER_PLAN_WINDOW_MS / 1000})`;
    const [result] = await tx<ResultRow[]>`
      select id, outcome from levelmeup.checkins
      where user_id = ${userId} and outcome in ('recovered', 'unbreakable', 'shield', 'reset') and resolved_at > now() - interval '2 days'
      order by resolved_at desc, id desc limit 1`;
    const { now } = one(await tx<{ now: Date }[]>`select now() as now`);
    const { pain } = one(await tx<{ pain: number }[]>`
      select count(*)::int as pain from levelmeup.events
      where user_id = ${userId} and type = 'pain' and applied_at > now() - make_interval(secs => ${PAIN_WINDOW_MS / 1000})`);
    const { workouts } = one(await tx<{ workouts: number }[]>`
      select count(*)::int as workouts from levelmeup.quest_instances
      where user_id = ${userId} and completed_at is not null and condition ->> 'kind' = 'session'
        and payload ->> 'offlineQuest' is null`);
    return {
      profile, character, ladders: [...ladders], days: [...days], instances: [...instances],
      earned: earned.map((r) => r.achievement_id), checkin: checkin ?? null, queue: [...queue], answered: [...answered],
      result: result ?? null, readAt: now, painReports: pain, workoutsDone: workouts,
    };
  } finally {
    await asService(tx);
  }
}

/** What only Character and Chronicle need (M6d decision 2), read as the player once per response. */
export async function loadHistory(tx: Tx, userId: string, book: string | null): Promise<History> {
  await asPlayer(tx, userId);
  try {
    const days = await tx<CalendarRow[]>`
      select day_number, starts_at, ends_at, time_zone, status, resolution, protection, hard_day from levelmeup.quest_days
      where user_id = ${userId} order by day_number desc limit ${CALENDAR_DAYS}`;
    const [dayOne] = await tx<Pick<DayRow, 'starts_at' | 'ends_at' | 'time_zone'>[]>`
      select starts_at, ends_at, time_zone from levelmeup.quest_days where user_id = ${userId} and day_number = 1`;
    const { rungs } = one(await tx<{ rungs: number }[]>`
      select count(*)::int as rungs from levelmeup.xp_ledger where user_id = ${userId} and source_type = 'rung'`);
    const reading = book === null
      ? { sessions: 0, minutes: 0 }
      : one(await tx<{ sessions: number; minutes: number }[]>`
          select count(*)::int as sessions, coalesce(sum(q.minutes), 0)::int as minutes
          from levelmeup.quest_instances q join levelmeup.profiles p on p.user_id = q.user_id
          where q.user_id = ${userId} and q.book = ${book} and q.completed_at is not null
            and q.completed_at >= coalesce(p.book_started_at, '-infinity'::timestamptz)`);
    return { days: [...days], dayOne: dayOne ?? null, newRungs: rungs, reading };
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
