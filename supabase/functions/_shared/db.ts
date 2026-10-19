// Postgres access for the Edge Functions, as lmu_service (LMU_DB_URL, transaction pooler). Reads run as the player
// (role lmu_player with their claims) so row level security decides; writes call the levelmeup functions. lmu_player
// can read LevelMeUp's tables and nothing else, so no claims can reach the wedding's data (migration 0004).
import postgres from 'npm:postgres@3.4.9';
import { LIGHTER_PLAN_WINDOW_MS, PAIN_WINDOW_MS, programRun } from '../../../packages/rules/src/index.ts';
import { statWeeks } from './plus.ts';
import type { EntitlementRow } from './plus.ts';
import { READINGS_SHOWN, articleBody } from './reading.ts';
import type { ArticleBody, ArticleRow, CandidateRow, ReadingRow, SourceRow } from './reading.ts';
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
      select c.id, c.day_id, c.gap_from, c.gap_to, c.answer, c.recovery_day_id, c.consequence, c.trial_done_at, c.note,
        d.day_number as missed_day, d.starts_at as missed_starts_at, d.ends_at as missed_ends_at, d.time_zone as missed_time_zone,
        q.template_id as missed_core, q.ladder_id as missed_ladder,
        exists (select 1 from levelmeup.quest_instances r
          where r.day_id = c.recovery_day_id and r.slot = 'recovery' and r.completed_at is not null) as recovered,
        (select g.ends_at from levelmeup.quest_days g where g.user_id = c.user_id and g.day_number = c.gap_from - 1) as gap_starts_at
      from levelmeup.checkins c
      left join levelmeup.quest_days d on d.id = c.day_id
      left join levelmeup.quest_instances q on q.day_id = c.day_id and q.slot = 'core'
      where c.user_id = ${userId} and c.resolved_at is null
      order by c.id limit 1`;
    const queue = await tx<QueuedDay[]>`
      select id, day_number, resolution from levelmeup.quest_days
      where user_id = ${userId} and status = 'closed' and not streak_applied order by day_number`;
    const answered = await tx<AnsweredRow[]>`
      select id, answer, answered_at, gap_from, gap_to, consequence, recovery_day_id from levelmeup.checkins
      where user_id = ${userId} and answered_at > now() - make_interval(secs => ${LIGHTER_PLAN_WINDOW_MS / 1000})`;
    const [result] = await tx<ResultRow[]>`
      select id, outcome from levelmeup.checkins
      where user_id = ${userId} and outcome in ('recovered', 'unbreakable', 'shield', 'reset') and resolved_at > now() - interval '2 days'
      order by resolved_at desc, id desc limit 1`;
    const { now } = one(await tx<{ now: Date }[]>`select now() as now`);
    // M13: LevelMeUp Plus grants (the Founder grant, a Play purchase).
    const entitlements = await tx<EntitlementRow[]>`
      select source, product, starts_at, ends_at, trial, will_renew, manage_url, checked_at from levelmeup.entitlements where user_id = ${userId}`;
    const { pain } = one(await tx<{ pain: number }[]>`
      select count(*)::int as pain from levelmeup.events
      where user_id = ${userId} and type = 'pain' and applied_at > now() - make_interval(secs => ${PAIN_WINDOW_MS / 1000})`);
    const { workouts } = one(await tx<{ workouts: number }[]>`
      select count(*)::int as workouts from levelmeup.quest_instances
      where user_id = ${userId} and completed_at is not null and condition ->> 'kind' = 'session'
        and payload ->> 'offlineQuest' is null`);
    // M15 decision 3: the weekly workouts that count (the full version, not rated too hard) since the weekly program was
    // last switched on; programRun keeps the current run.
    const program = await tx<{ at: Date }[]>`
      select q.completed_at as at from levelmeup.quest_instances q
      join levelmeup.profiles p on p.user_id = q.user_id
      where q.user_id = ${userId} and q.completed_at is not null and q.ladder_id = 'program' and not q.hard_day
        and q.rating is distinct from 'too_hard' and q.payload ->> 'offlineQuest' is null
        and p.program_since is not null and q.completed_at >= p.program_since`;
    // M8b: the published library, with the last day each article was given to this player ("unread": never).
    const articles = await tx<CandidateRow[]>`
      select a.id, a.cluster, a.title, a.reading_minutes, a.evergreen, a.published_at, g.last_given
      from levelmeup.articles a
      left join (select article_id, max(day_number)::int as last_given from levelmeup.quest_days
        where user_id = ${userId} and article_id is not null group by article_id) g on g.article_id = a.id
      where a.status = 'published'
      order by a.published_at, a.id`;
    return {
      profile, character, ladders: [...ladders], days: [...days], instances: [...instances],
      earned: earned.map((r) => r.achievement_id), checkin: checkin ?? null, queue: [...queue], answered: [...answered],
      result: result ?? null, readAt: now, painReports: pain, workoutsDone: workouts,
      programDone: programRun(program.map((r) => r.at.getTime()), now.getTime()), articles: [...articles],
      entitlements: [...entitlements],
    };
  } finally {
    await asService(tx);
  }
}

/**
 * What only Character and Chronicle need (M6d decision 2), read as the player once per response. M13: the all-time stat
 * chart only for a Plus player (`plus`: plusView's answer), in weeks of the player's time zone from their starting points.
 */
export async function loadHistory(tx: Tx, userId: string, book: string | null, plus = false): Promise<History> {
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
    // M8b: the latest days with a published article, and the takeaway written on each (decision 7).
    const readings = await tx<ReadingRow[]>`
      select d.day_number, d.starts_at, d.ends_at, d.time_zone, a.id as article_id, a.title, a.cluster, a.reading_minutes,
        q.payload ->> 'text' as takeaway
      from levelmeup.quest_days d
      join levelmeup.articles a on a.id = d.article_id
      left join levelmeup.quest_instances q on q.day_id = d.id and q.slot = 'article' and q.completed_at is not null
      where d.user_id = ${userId}
      order by d.day_number desc limit ${READINGS_SHOWN}`;
    const weeks = plus ? await statWeeksOf(tx, userId) : null;
    return { days: [...days], dayOne: dayOne ?? null, newRungs: rungs, reading, readings: [...readings], statWeeks: weeks };
  } finally {
    await asService(tx);
  }
}

/** M13: weekly XP by stat over all time (at most STAT_WEEKS weeks, the latest), as running points. Read as the player. */
async function statWeeksOf(tx: Tx, userId: string) {
  const [c] = await tx<{ time_zone: string; start_strength: number; start_vitality: number; start_wisdom: number; start_focus: number; start_discipline: number }[]>`
    select p.time_zone, c.start_strength, c.start_vitality, c.start_wisdom, c.start_focus, c.start_discipline
    from levelmeup.profiles p join levelmeup.character_state c on c.user_id = p.user_id where p.user_id = ${userId}`;
  if (c === undefined) return [];
  const sums = await tx<{ week: string; stat: string; xp: number }[]>`
    select to_char(date_trunc('week', created_at at time zone ${c.time_zone}), 'YYYY-MM-DD') as week, stat, sum(amount)::int as xp
    from levelmeup.xp_ledger where user_id = ${userId} group by 1, 2 order by 1`;
  const start = { strength: c.start_strength, vitality: c.start_vitality, wisdom: c.start_wisdom, focus: c.start_focus, discipline: c.start_discipline };
  return statWeeks(start, sums).slice(-STAT_WEEKS);
}

/** M13: the chart's span, about five years. */
export const STAT_WEEKS = 260;

/** M8b: whole articles, read as the player (row level security: published only), in the order asked. */
export async function loadBodies(tx: Tx, userId: string, ids: readonly string[]): Promise<ArticleBody[]> {
  if (ids.length === 0) return [];
  await asPlayer(tx, userId);
  try {
    const rows = await tx<ArticleRow[]>`
      select id, cluster, title, summary, sections, takeaways, reflection_question, reading_minutes, deck
      from levelmeup.articles where id in ${tx(ids)}`;
    const sources = await tx<SourceRow[]>`
      select article_id, idx, url, title from levelmeup.article_sources where article_id in ${tx(ids)}`;
    return ids.flatMap((id) => {
      const row = rows.find((r) => r.id === id);
      return row === undefined ? [] : [articleBody(row, sources)];
    });
  } finally {
    await asService(tx);
  }
}

/** M8b: the published library, all unread: a new character's day 1 (a restart starts the readings over too). */
export async function loadLibrary(tx: Tx, userId: string): Promise<CandidateRow[]> {
  await asPlayer(tx, userId);
  try {
    return [...await tx<CandidateRow[]>`
      select id, cluster, title, reading_minutes, evergreen, published_at, null::int as last_given
      from levelmeup.articles where status = 'published' order by published_at, id`];
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
