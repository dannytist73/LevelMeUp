// POST /functions/v1/lmu-sync — the phone's one round trip (architecture §4.1, §6): apply its events in order
// (completions and the M6b adjustments), close ended days and build the next one, award achievements, and return the
// player's state. The server's numbers win. M6e: a day the phone built offline is applied as of when it was built, and
// quests of that day are found by day and slot until the phone has their ids.
import type postgres from 'npm:postgres@3.4.9';
import { findTemplate, newAchievements } from '../../../packages/rules/src/index.ts';
import { ACHIEVEMENTS, CONTENT_VERSION, LIBRARY } from '../../../packages/content/src/index.ts';
import { planAdjust, planOfflinePain } from '../_shared/adjust.ts';
import type { Plan } from '../_shared/adjust.ts';
import { planAdvance } from '../_shared/advance.ts';
import { asPlayer, asService, db, lmuCode, loadBodies, loadHistory, loadSnapshot, one } from '../_shared/db.ts';
import type { Tx } from '../_shared/db.ts';
import { adjustPayload, applyOrder, checkCompletionPayload, isAdjust, parseSyncBody } from '../_shared/events.ts';
import { retryable } from '../_shared/failures.ts';
import type { AdjustEvent, InsightEvent, PainEvent, PhoneEvent, ProvisionalDayEvent, Rejected, SlotRef } from '../_shared/events.ts';
import { isProblem, json, problem, problemResponse, readJson } from '../_shared/http.ts';
import { provisionalClock, sameQuests } from '../_shared/offline.ts';
import { bodiesToSend, planInsight } from '../_shared/reading.ts';
import { playerFromAuthHeader } from '../_shared/auth.ts';
import { authenticate } from '../_shared/session.ts';
import { playRecheckDue, plusView } from '../_shared/plus.ts';
import { refreshPlay, revenueCatKey } from '../_shared/revenuecat.ts';
import { achievementProgress, characterView, ladderMap, stateView } from '../_shared/state.ts';
import { dayOffers, openDay } from '../_shared/today.ts';
import { WEEKLY_MIN_APP_VERSION, tooOld } from '../_shared/version.ts';
import type { DayRow, InstanceRow, Snapshot } from '../_shared/state.ts';

/** Tries at closing days or adjusting one when another write got there first (`lmu:conflict`). */
const MAX_TRIES = 3;

/** `notice` (M7b decision 7): applied, with a word for the player, shown like a refusal's. */
type Applied = { id: string; ok: true; result: unknown; notice?: string } | Rejected & { ok: false };

const jsonParam = (tx: Tx, value: unknown) => tx.json(value as postgres.JSONValue);

type PlayEvent = Exclude<PhoneEvent, AdjustEvent | ProvisionalDayEvent | InsightEvent>;

type QuestRow = Pick<InstanceRow, 'id' | 'template_id' | 'completion' | 'condition' | 'minutes'> & Pick<DayRow, 'starts_at' | 'ends_at'>;

/** The quest an event names, read as the player: by id, or (M6e) by its day and slot on a day the phone built offline. */
async function questRow(tx: Tx, userId: string, target: { instanceId: number | null; ref?: SlotRef }): Promise<QuestRow | null> {
  await asPlayer(tx, userId);
  try {
    const rows = target.ref === undefined
      ? await tx<QuestRow[]>`
          select q.id, q.template_id, q.completion, q.condition, q.minutes, d.starts_at, d.ends_at
          from levelmeup.quest_instances q join levelmeup.quest_days d on d.id = q.day_id
          where q.id = ${target.instanceId}::bigint and q.user_id = ${userId}::uuid`
      : await tx<QuestRow[]>`
          select q.id, q.template_id, q.completion, q.condition, q.minutes, d.starts_at, d.ends_at
          from levelmeup.quest_instances q join levelmeup.quest_days d on d.id = q.day_id
          where d.user_id = ${userId}::uuid and d.day_number = ${target.ref.dayNumber}::int and q.slot = ${target.ref.slot}`;
    return rows[0] ?? null;
  } finally {
    await asService(tx);
  }
}

async function applyEvent(userId: string, event: PhoneEvent, timeZone: string): Promise<Applied> {
  try {
    if (event.type === 'provisional_day') {
      const kept = await provisional(userId, event);
      // Stored with the server's own quests: the phone shows a notice and drops its day (decision 13).
      if (kept.kept === 'server') return { id: event.id, ok: false, code: 'day_rebuilt' };
      return { id: event.id, ok: true, result: kept };
    }
    if (event.type === 'insight') return { id: event.id, ok: true, result: await insight(userId, event) };
    // M7a decision 2: ended days close first, so a check-in's answer always lands on the day that runs now.
    if (event.type === 'checkin') await advance(userId, timeZone);
    if (!isAdjust(event)) return { id: event.id, ok: true, result: await play(userId, event) };
    const { result, notice } = await adjust(userId, event);
    return notice === null ? { id: event.id, ok: true, result } : { id: event.id, ok: true, result, notice };
  } catch (error) {
    const code = lmuCode(error);
    // Still busy after every try: the whole sync answers 503 and the phone sends the event again.
    if (code === 'conflict') throw error;
    if (code !== null) return { id: event.id, ok: false, code };
    if (badData(error)) {
      // Logged: a server bug can look like bad data too, and the player's completion would otherwise vanish quietly.
      console.error('lmu-sync: the database refused an event', event.type, (error as { code?: string }).code, (error as Error).message);
      return { id: event.id, ok: false, code: 'bad_payload' };
    }
    // Anything else would fail again on every try and hold back every event behind it (audit 2026-10-15): only a
    // failure that can pass on its own fails the sync; this one event is refused, and logged so it can be fixed.
    if (retryable(error)) throw error;
    console.error('lmu-sync: an event failed and was refused', event.type, event.id, error);
    return { id: event.id, ok: false, code: 'server_error' };
  }
}

/** A completion, undo or rating (M3); M6e: of a quest named by its day and slot. */
function play(userId: string, event: PlayEvent): Promise<unknown> {
  return db().begin(async (tx) => {
    if (event.type === 'complete') {
      const row = await questRow(tx, userId, event);
      if (row === null) throw new Error('lmu:not_found');
      // Named by its slot (M6e) but not the quest the phone showed: the server's day won. The work still counts for the
      // quest now in that slot (decision 7), checked against the quest the player did; it is marked, so it moves no
      // ladder and is no workout done, and its rating was for the other quest (review).
      const did = event.ref !== undefined && row.template_id !== event.ref.templateId ? event.ref.templateId : null;
      const checked = did === null ? checkCompletionPayload(row, row, event.payload, Date.now()) : checkDone(did, row, event.payload);
      if ('code' in checked) throw new Error(`lmu:${checked.code}`);
      const payload = did === null ? checked.payload : { ...checked.payload, offlineQuest: did };
      return one(await tx<{ r: unknown }[]>`select levelmeup.complete_quest(${userId}::uuid, ${event.id}::uuid, ${row.id}::bigint,
        ${new Date(event.completedAt)}::timestamptz, ${did === null ? event.rating : null}::text, ${jsonParam(tx, payload)}::jsonb) as r`).r;
    }
    let instanceId = event.instanceId;
    if (event.ref !== undefined) {
      const row = await questRow(tx, userId, event);
      if (row === null) throw new Error('lmu:not_found');
      // A rating was for the phone's quest, not the one the server put in its slot (review).
      if (event.type === 'rate' && row.template_id !== event.ref.templateId) throw new Error('lmu:quest_changed');
      instanceId = Number(row.id);
    }
    if (instanceId === null) throw new Error('lmu:not_found');
    if (event.type === 'undo') {
      return one(await tx<{ r: unknown }[]>`select levelmeup.undo_quest(${userId}::uuid, ${event.id}::uuid, ${instanceId}::bigint) as r`).r;
    }
    return one(await tx<{ r: unknown }[]>`
      select levelmeup.rate_quest(${userId}::uuid, ${event.id}::uuid, ${instanceId}::bigint, ${event.rating}::text) as r`).r;
  });
}

/**
 * The Mage's Insight (M8b decision 8): checked against a fresh snapshot, then stored by levelmeup.set_insight. A repeat of
 * an applied event answers from its stored result (set_insight reads it before the day).
 */
function insight(userId: string, event: InsightEvent): Promise<unknown> {
  return db().begin(async (tx) => {
    const s = await loadSnapshot(tx, userId);
    if (s === null) throw new Error('lmu:not_started');
    await asPlayer(tx, userId);
    const seen = await tx`select 1 from levelmeup.events where user_id = ${userId}::uuid and client_event_id = ${event.id}::uuid`;
    await asService(tx);
    let day = 0;
    if (seen.length === 0) {
      const { now } = one(await tx<{ now: Date }[]>`select now() as now`);
      const open = openDay(s);
      const plan = planInsight(
        s.articles,
        { classId: s.profile.class_id, level: characterView(s.character).level },
        open === null ? null : { number: open.day_number, articleId: open.article_id, status: open.status, endsAtMs: open.ends_at.getTime() },
        event.cluster,
        now.getTime(),
      );
      if ('code' in plan) throw new Error(`lmu:${plan.code}`);
      day = plan.day;
    }
    return one(await tx<{ r: unknown }[]>`
      select levelmeup.set_insight(${userId}::uuid, ${event.id}::uuid, ${event.cluster}::text, ${day}::int) as r`).r;
  });
}

/**
 * A completion of the phone's quest counted for another (M6e review): its payload is checked against the quest the player
 * did. A quest this content doesn't know (another app version) counts unchecked.
 */
function checkDone(templateId: string, row: QuestRow, payload: unknown): ReturnType<typeof checkCompletionPayload> {
  const template = findTemplate(LIBRARY, templateId);
  if (template === undefined) return { payload: {} };
  return checkCompletionPayload({ completion: template.completion, condition: template.condition, minutes: template.minutes }, row, payload, Date.now());
}

/**
 * An adjustment (M6b): planned by the rules from a fresh snapshot, then written by `levelmeup.adjust` at that snapshot's
 * version; another write in between (`lmu:conflict`) means planning again. A repeat of an applied event skips the
 * planning (the state has moved on since): `levelmeup.adjust` returns its stored result, or refuses the id reused.
 */
async function adjust(userId: string, event: AdjustEvent): Promise<{ result: unknown; notice: string | null }> {
  const payload = adjustPayload(event);
  for (let attempt = 1; ; attempt++) {
    try {
      return await db().begin(async (tx) => {
        const write = async (version: number, change: unknown): Promise<unknown> => one(await tx<{ r: unknown }[]>`
          select levelmeup.adjust(${userId}::uuid, ${event.id}::uuid, ${version}::int, ${event.type}::text,
            ${jsonParam(tx, payload)}::jsonb, ${jsonParam(tx, change)}::jsonb) as r`).r;
        await asPlayer(tx, userId);
        const seen = await tx`select 1 from levelmeup.events where user_id = ${userId}::uuid and client_event_id = ${event.id}::uuid`;
        await asService(tx);
        if (seen.length > 0) return { result: await write(-1, {}), notice: null };
        const snapshot = await loadSnapshot(tx, userId);
        if (snapshot === null) throw new Error('lmu:not_started');
        // The database clock, the one levelmeup.adjust checks the day against.
        const { now } = one(await tx<{ now: Date }[]>`select now() as now`);
        const plan = event.type === 'pain' && event.ref !== undefined
          ? await slotPain(tx, userId, snapshot, event, now.getTime())
          : planAdjust(snapshot, event, { nowMs: now.getTime(), library: LIBRARY });
        if ('code' in plan) throw new Error(`lmu:${plan.code}`);
        return { result: await write(snapshot.character.version, plan.change), notice: plan.notice ?? null };
      });
    } catch (error) {
      if (lmuCode(error) !== 'conflict' || attempt >= MAX_TRIES) throw error;
    }
  }
}

/**
 * "I felt pain" about a quest named by its slot (M6e decision 7): the quest there when it is the one the phone showed;
 * when the server rebuilt the day (review), or never stored it (a phone clock ahead, device check), the exercise the
 * player did still rests: a pain report is never lost to a sync problem.
 */
async function slotPain(tx: Tx, userId: string, s: Snapshot, event: PainEvent & { ref: SlotRef }, nowMs: number): Promise<Plan> {
  const row = await questRow(tx, userId, event);
  if (row === null || row.template_id !== event.ref.templateId) {
    return planOfflinePain(s, { dayNumber: event.ref.dayNumber, templateId: event.ref.templateId, choice: event.choice, at: event.at }, { nowMs, library: LIBRARY });
  }
  return planAdjust(s, { id: event.id, type: 'pain', instanceId: Number(row.id), choice: event.choice, ...(event.at === undefined ? {} : { at: event.at }) }, { nowMs, library: LIBRARY });
}

type Kept = { dayNumber: number; kept: 'phone' | 'existing' | 'server' };

/**
 * A day the phone built offline (M6e decision 5): closes what had ended and builds the next day as of when the phone
 * built it, so a day the player opened isn't skipped as an away day, keeping the phone's quests when the rules allow
 * them. A day that already exists stays as it is. Nothing is recorded: a repeat finds the day and answers the same.
 */
async function provisional(userId: string, event: ProvisionalDayEvent): Promise<Kept> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await db().begin(async (tx): Promise<Kept> => {
        const snapshot = await loadSnapshot(tx, userId);
        if (snapshot === null) throw new Error('lmu:not_started');
        const stored = snapshot.days.find((d) => d.day_number === event.dayNumber);
        if (stored !== undefined) {
          const quests = snapshot.instances.filter((q) => String(q.day_id) === String(stored.id));
          if (sameQuests(quests, event.quests)) return { dayNumber: event.dayNumber, kept: 'existing' };
          console.info('lmu-sync: an offline day was rebuilt', userId, ['the day was already stored with other quests']);
          return { dayNumber: event.dayNumber, kept: 'server' };
        }
        if (snapshot.days.some((d) => d.day_number > event.dayNumber)) {
          console.info('lmu-sync: an offline day was rebuilt', userId, ['a later day is already stored']);
          return { dayNumber: event.dayNumber, kept: 'server' };
        }
        const { now } = one(await tx<{ now: Date }[]>`select now() as now`);
        const lastEndsAt = Math.max(...snapshot.days.map((d) => d.ends_at.getTime()));
        const asOf = provisionalClock(event.builtAt, now.getTime(), lastEndsAt);
        if (asOf === null) throw new Error('lmu:clock_ahead');
        const outcome = planAdvance({
          ...snapshot, pending: snapshot.checkin, timeZone: event.timeZone, nowMs: asOf, library: LIBRARY, contentVersion: CONTENT_VERSION,
          provisional: { dayNumber: event.dayNumber, quests: event.quests, articleId: event.articleId ?? null },
        });
        // The server's last day was still running when the phone built the next one: the phone's clock is ahead.
        if (outcome === null || outcome.newDay === null) throw new Error('lmu:clock_ahead');
        if (outcome.buildError !== null) console.error('lmu-sync: a day was built without quests', userId, outcome.buildError);
        if (outcome.offline?.kept === 'server') console.info('lmu-sync: an offline day was rebuilt', userId, outcome.offline.problems);
        await tx`select levelmeup.advance(${userId}::uuid, ${snapshot.character.version}::int, ${jsonParam(tx, outcome)}::jsonb)`;
        return { dayNumber: outcome.newDay.dayNumber, kept: outcome.offline?.kept ?? 'server' };
      });
    } catch (error) {
      if (lmuCode(error) !== 'conflict' || attempt >= MAX_TRIES) throw error;
    }
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
        const outcome = planAdvance({
          ...snapshot, pending: snapshot.checkin, timeZone, nowMs: now.getTime(), library: LIBRARY, contentVersion: CONTENT_VERSION,
        });
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

/** The achievements a snapshot has reached and not yet earned. */
const reached = (snapshot: Snapshot): string[] =>
  newAchievements(ACHIEVEMENTS, achievementProgress(snapshot.character, ladderMap(snapshot.ladders)), snapshot.earned);

/**
 * M13 (review): a Play row whose period ended since RevenueCat was last asked (a renewal, a trial turned paid, a lapse)
 * or that wasn't checked for a week is asked about before the state is read. Briefly, and never failing the sync.
 */
async function recheckPlus(userId: string, s: Snapshot): Promise<boolean> {
  const key = revenueCatKey();
  if (key === null || !playRecheckDue(s.entitlements, s.readAt)) return false;
  await refreshPlay(db(), key, userId, 4_000).catch((error) => console.error('lmu-sync: the Plus recheck failed', error));
  return true;
}

Deno.serve(async (req) => {
  // M9b decision 5: an app too old for this server updates first; nothing it sent is read.
  const old = tooOld(req);
  if (old !== null) return problemResponse(old);
  // M17 (perf audit 2026-10-20): the session check (a call to Auth) and the first read of the player go out together.
  // The gateway has already verified the token (verify_jwt), so the id is the token's; nothing read is used or returned
  // unless Auth then confirms the session.
  const claimed = playerFromAuthHeader(req.headers.get('authorization'), Date.now());
  if ('code' in claimed) return problemResponse(claimed);
  const reading = db().begin((tx) => loadSnapshot(tx, claimed.userId));
  reading.catch(() => {}); // a refused session never waits on, or reports, this read
  const player = await authenticate(req);
  if (isProblem(player)) return problemResponse(player);
  const body = await readJson(req);
  if (isProblem(body)) return problemResponse(body);
  const request = parseSyncBody(body);
  if (isProblem(request)) return problemResponse(request);

  try {
    const started = player.userId === claimed.userId ? await reading : await db().begin((tx) => loadSnapshot(tx, player.userId));
    if (started === null) return problemResponse(problem(404, 'not_started'));
    // M16: a character that has been on the weekly program needs an app that knows its quests (one may still be open
    // after switching back); an older one updates first, as above.
    const behind = started.profile.program_since !== null ? tooOld(req, WEEKLY_MIN_APP_VERSION) : null;
    if (behind !== null) return problemResponse(behind);
    // Events first, so an offline completion always lands before its day closes (architecture §4.3); check-in answers
    // last, since each closes the days that have ended (M7a review). The results keep the phone's order.
    const results: Applied[] = new Array(request.events.length);
    for (const i of applyOrder(request.events)) results[i] = await applyEvent(player.userId, request.events[i]!, request.timeZone);
    // M17 (perf audit 2026-10-20): a sync with no events whose day hasn't ended (the launch and foreground syncs) reads the
    // player once, not four times. With events, or a day to close, advance reads afresh as before.
    const quiet = request.events.length === 0;
    const due = !quiet || planAdvance({
      ...started, pending: started.checkin, timeZone: request.timeZone, nowMs: started.readAt.getTime(), library: LIBRARY, contentVersion: CONTENT_VERSION,
    }) !== null;
    if (due) await advance(player.userId, request.timeZone);
    const rechecked = await recheckPlus(player.userId, started);
    const { state, articles, newAchievementIds } = await db().begin(async (tx) => {
      let snapshot = due || rechecked ? (await loadSnapshot(tx, player.userId))! : started;
      // Achievements are awarded here, in the reply's own transaction, and the player read again only when one was.
      const earned = reached(snapshot);
      if (earned.length > 0) {
        await tx`select levelmeup.award_achievements(${player.userId}::uuid, ${earned}::text[])`;
        snapshot = (await loadSnapshot(tx, player.userId))!;
      }
      const history = await loadHistory(tx, player.userId, snapshot.profile.book, plusView(snapshot.entitlements, snapshot.readAt).active);
      const state = stateView(snapshot, dayOffers(snapshot, LIBRARY), history);
      // M8b decision 3: today's and the next day's articles and those asked for, unless the phone holds them.
      const ids = bodiesToSend([state.today?.article?.id ?? null, state.nextArticle?.id ?? null, ...request.want], request.have);
      return { state, articles: await loadBodies(tx, player.userId, ids), newAchievementIds: earned };
    });
    return json(200, { results, rejected: request.rejected, newAchievements: newAchievementIds, state, articles });
  } catch (error) {
    if (lmuCode(error) === 'conflict') return problemResponse(problem(503, 'busy', 'try again'));
    console.error('lmu-sync failed', error);
    return problemResponse(problem(500, 'internal'));
  }
});
