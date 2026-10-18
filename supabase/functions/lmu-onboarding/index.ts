// POST /functions/v1/lmu-onboarding — the player's answers become a character and day 1; `redo` builds it again until
// the first action (M5) (spec §1.1, §4.2).
import type postgres from 'npm:postgres@3.4.9';
import { LIBRARY } from '../../../packages/content/src/index.ts';
import { REVEAL_MODEL, claudeConfigured, writeReveal } from '../_shared/claude.ts';
import { ESTIMATE_USD, MONTHLY_CAP_USD, costUsd } from '../_shared/costs.ts';
import { db, hasActed, lmuCode, loadBodies, loadHistory, loadLibrary, loadSnapshot, one } from '../_shared/db.ts';
import { isObject, isProblem, json, problem, problemResponse, readJson } from '../_shared/http.ts';
import { parseOnboarding, parseReveal, revealFacts, startArgs, templateReveal } from '../_shared/onboarding.ts';
import type { Choices, Reveal } from '../_shared/onboarding.ts';
import { bodiesToSend } from '../_shared/reading.ts';
import { authenticate } from '../_shared/session.ts';
import { plusView } from '../_shared/plus.ts';
import { stateView } from '../_shared/state.ts';
import { dayOffers } from '../_shared/today.ts';
import { tooOld } from '../_shared/version.ts';

/** Claude calls per player for the reveal, lifetime (architecture §8). */
const AI_CAP = 3;

async function reveal(userId: string, choices: Choices): Promise<Reveal> {
  const fallback = templateReveal(choices);
  if (!claudeConfigured()) return fallback;
  let callId: string;
  try {
    callId = one(await db()<{ id: string }[]>`select levelmeup.reserve_ai_spend(${userId}::uuid, 'onboarding', ${REVEAL_MODEL},
      ${ESTIMATE_USD.reveal}::numeric, ${MONTHLY_CAP_USD}::numeric, ${AI_CAP}::int, null::bigint) as id`).id;
  } catch (error) {
    // Over the player's three calls or the month's budget (M8a decision 7): the template reveal, as when Claude is off.
    const code = lmuCode(error);
    if (code === 'ai_cap' || code === 'ai_budget') return fallback;
    throw error;
  }
  const call = await writeReveal(revealFacts(choices));
  const parsed = 'value' in call ? parseReveal(call.value) : null;
  const status = parsed !== null ? 'ok' : 'error' in call ? 'failed' : 'fallback';
  const cost = call.inputTokens !== null && call.outputTokens !== null
    ? costUsd(REVEAL_MODEL, { input_tokens: call.inputTokens, output_tokens: call.outputTokens }, false)
    : 'maybeBilled' in call && call.maybeBilled ? ESTIMATE_USD.reveal : 0;
  await db()`select levelmeup.finish_ai_call(${callId}::bigint, ${status}, ${call.inputTokens}::int,
    ${call.outputTokens}::int, ${cost}::numeric, ${'error' in call ? call.error : parsed === null ? 'invalid reveal' : null})`;
  return parsed ?? fallback;
}

Deno.serve(async (req) => {
  // M9b decision 5: an app too old for this server updates first; nothing it sent is read.
  const old = tooOld(req);
  if (old !== null) return problemResponse(old);
  const player = await authenticate(req);
  if (isProblem(player)) return problemResponse(player);
  const body = await readJson(req);
  if (isProblem(body)) return problemResponse(body);
  const choices = parseOnboarding(body);
  if (isProblem(choices)) return problemResponse(choices);
  // The reveal's corrections (M5): the same call again; the SQL refuses it once the player has done anything.
  const redo = isObject(body) && body.redo === true;

  try {
    const existing = await db().begin((tx) => loadSnapshot(tx, player.userId));
    if (existing !== null && !redo) return problemResponse(problem(409, 'already_started'));
    // Refused before any Claude call: a redo after the player has done anything would spend one of the three reveal
    // calls on an answer restart_player refuses anyway (M5 review).
    if (existing !== null && (await db().begin((tx) => hasActed(tx, player.userId)))) return problemResponse(problem(409, 'locked'));
    const words = await reveal(player.userId, choices);
    const { state, articles } = await db().begin(async (tx) => {
      const j = (value: unknown) => tx.json(value as postgres.JSONValue);
      // Day 1 starts on the database clock, the one every later check uses.
      const { now } = one(await tx<{ now: Date }[]>`select now() as now`);
      const args = startArgs(choices, words, now.getTime(), LIBRARY, await loadLibrary(tx, player.userId));
      if (existing === null) {
        await tx`select levelmeup.start_player(${player.userId}::uuid, ${j(args.profile)}::jsonb, ${j(args.character)}::jsonb,
          ${j(args.ladders)}::jsonb, ${j(args.day)}::jsonb)`;
      } else {
        await tx`select levelmeup.restart_player(${player.userId}::uuid, ${j(args.profile)}::jsonb, ${j(args.character)}::jsonb,
          ${j(args.ladders)}::jsonb, ${j(args.day)}::jsonb)`;
      }
      const snapshot = (await loadSnapshot(tx, player.userId))!;
      const history = await loadHistory(tx, player.userId, snapshot.profile.book, plusView(snapshot.entitlements, snapshot.readAt).active);
      const state = stateView(snapshot, dayOffers(snapshot, LIBRARY), history);
      const ids = bodiesToSend([state.today?.article?.id ?? null, state.nextArticle?.id ?? null], []);
      return { state, articles: await loadBodies(tx, player.userId, ids) };
    });
    return json(201, { reveal: words, state, articles });
  } catch (error) {
    const code = lmuCode(error);
    if (code === 'already_started' || code === 'locked') return problemResponse(problem(409, code));
    // Two redos at once: the second waited on a character the first replaced (M5 review). Trying again works.
    if (code === 'not_started' && redo) return problemResponse(problem(503, 'busy', 'try again'));
    console.error('lmu-onboarding failed', error);
    return problemResponse(problem(500, 'internal'));
  }
});
