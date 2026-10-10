// POST /functions/v1/lmu-sync — the phone's one round trip (architecture §4.1, §6): apply its events in order, close
// ended days and build the next one, award achievements, and return the player's state. The server's numbers win.
import type postgres from 'npm:postgres@3.4.9';
import { newAchievements } from '../../../packages/rules/src/index.ts';
import { ACHIEVEMENTS, CONTENT_VERSION, LIBRARY } from '../../../packages/content/src/index.ts';
import { planAdvance } from '../_shared/advance.ts';
import { asPlayer, asService, db, lmuCode, loadSnapshot, one } from '../_shared/db.ts';
import type { Tx } from '../_shared/db.ts';
import { checkCompletionPayload } from '../_shared/events.ts';
import type { PhoneEvent, Rejected } from '../_shared/events.ts';
import { parseSyncBody } from '../_shared/events.ts';
import { isProblem, json, problem, problemResponse, readJson } from '../_shared/http.ts';
import { authenticate } from '../_shared/session.ts';
import { achievementProgress, ladderMap, stateView } from '../_shared/state.ts';
import type { DayRow, InstanceRow } from '../_shared/state.ts';

/** Tries at closing days when another write got there first (`lmu:conflict`). */
const MAX_TRIES = 3;

type Applied = { id: string; ok: true; result: unknown } | Rejected & { ok: false };

const jsonParam = (tx: Tx, value: unknown) => tx.json(value as postgres.JSONValue);

async function applyEvent(userId: string, event: PhoneEvent): Promise<Applied> {
  try {
    const result = await db().begin(async (tx) => {
      if (event.type === 'complete') {
        await asPlayer(tx, userId);
        const [row] = await tx<(Pick<InstanceRow, 'completion' | 'condition' | 'minutes'> & Pick<DayRow, 'starts_at' | 'ends_at'>)[]>`
          select q.completion, q.condition, q.minutes, d.starts_at, d.ends_at
          from levelmeup.quest_instances q join levelmeup.quest_days d on d.id = q.day_id
          where q.id = ${event.instanceId}::bigint and q.user_id = ${userId}::uuid`;
        await asService(tx);
        if (row === undefined) throw new Error('lmu:not_found');
        const checked = checkCompletionPayload(row, row, event.payload, Date.now());
        if ('code' in checked) throw new Error(`lmu:${checked.code}`);
        return one(await tx<{ r: unknown }[]>`select levelmeup.complete_quest(${userId}::uuid, ${event.id}::uuid, ${event.instanceId}::bigint,
          ${new Date(event.completedAt)}::timestamptz, ${event.rating}::text, ${jsonParam(tx, checked.payload)}::jsonb) as r`).r;
      }
      if (event.type === 'undo') {
        return one(await tx<{ r: unknown }[]>`select levelmeup.undo_quest(${userId}::uuid, ${event.id}::uuid, ${event.instanceId}::bigint) as r`).r;
      }
      return one(await tx<{ r: unknown }[]>`
        select levelmeup.rate_quest(${userId}::uuid, ${event.id}::uuid, ${event.instanceId}::bigint, ${event.rating}::text) as r`).r;
    });
    return { id: event.id, ok: true, result };
  } catch (error) {
    const code = lmuCode(error);
    if (code !== null) return { id: event.id, ok: false, code };
    if (badData(error)) {
      // Logged: a server bug can look like bad data too, and the player's completion would otherwise vanish quietly.
      console.error('lmu-sync: the database refused an event', event.type, (error as { code?: string }).code, (error as Error).message);
      return { id: event.id, ok: false, code: 'bad_payload' };
    }
    throw error;
  }
}

/**
 * An event whose data Postgres refuses (SQLSTATE class 22) is rejected on its own, so one bad event can't fail every
 * retry of the phone's outbox. Anything else is a real failure and fails the sync.
 */
function badData(error: unknown): boolean {
  const sqlstate = (error as { code?: unknown }).code;
  return typeof sqlstate === 'string' && sqlstate.startsWith('22');
}

/** Closes ended days and builds the next one; recomputes from fresh state if another write got there first. */
async function advance(userId: string, timeZone: string): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await db().begin(async (tx) => {
        const snapshot = await loadSnapshot(tx, userId);
        if (snapshot === null) throw new Error('lmu:not_started');
        // The database clock, so "has this day ended?" means the same here and in levelmeup.advance.
        const { now } = one(await tx<{ now: Date }[]>`select now() as now`);
        const outcome = planAdvance({ ...snapshot, timeZone, nowMs: now.getTime(), library: LIBRARY, contentVersion: CONTENT_VERSION });
        if (outcome === null) return;
        if (outcome.buildError !== null) console.error('lmu-sync: a day was built without quests', userId, outcome.buildError);
        await tx`select levelmeup.advance(${userId}::uuid, ${snapshot.character.version}::int, ${jsonParam(tx, outcome)}::jsonb)`;
      });
      return;
    } catch (error) {
      if (lmuCode(error) !== 'conflict' || attempt >= MAX_TRIES) throw error;
    }
  }
}

async function awardAchievements(userId: string): Promise<string[]> {
  return db().begin(async (tx) => {
    const snapshot = await loadSnapshot(tx, userId);
    if (snapshot === null) return [];
    const earned = newAchievements(ACHIEVEMENTS, achievementProgress(snapshot.character, ladderMap(snapshot.ladders)), snapshot.earned);
    if (earned.length > 0) await tx`select levelmeup.award_achievements(${userId}::uuid, ${earned}::text[])`;
    return earned;
  });
}

Deno.serve(async (req) => {
  const player = await authenticate(req);
  if (isProblem(player)) return problemResponse(player);
  const body = await readJson(req);
  if (isProblem(body)) return problemResponse(body);
  const request = parseSyncBody(body);
  if (isProblem(request)) return problemResponse(request);

  try {
    const started = await db().begin((tx) => loadSnapshot(tx, player.userId));
    if (started === null) return problemResponse(problem(404, 'not_started'));
    // Events first, so an offline completion always lands before its day closes (architecture §4.3).
    const results: Applied[] = [];
    for (const event of request.events) results.push(await applyEvent(player.userId, event));
    await advance(player.userId, request.timeZone);
    const newAchievementIds = await awardAchievements(player.userId);
    const snapshot = await db().begin((tx) => loadSnapshot(tx, player.userId));
    return json(200, {
      results,
      rejected: request.rejected,
      newAchievements: newAchievementIds,
      state: stateView(snapshot!),
    });
  } catch (error) {
    if (lmuCode(error) === 'conflict') return problemResponse(problem(503, 'busy', 'try again'));
    console.error('lmu-sync failed', error);
    return problemResponse(problem(500, 'internal'));
  }
});
