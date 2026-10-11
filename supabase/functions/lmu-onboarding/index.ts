// POST /functions/v1/lmu-onboarding — the player's answers become a character and day 1; `redo` builds it again until
// the first action (M5) (spec §1.1, §4.2).
import type postgres from 'npm:postgres@3.4.9';
import { LIBRARY } from '../../../packages/content/src/index.ts';
import { REVEAL_MODEL, claudeConfigured, writeReveal } from '../_shared/claude.ts';
import { db, hasActed, lmuCode, loadHistory, loadSnapshot, one } from '../_shared/db.ts';
import { isObject, isProblem, json, problem, problemResponse, readJson } from '../_shared/http.ts';
import { parseOnboarding, parseReveal, revealFacts, startArgs, templateReveal } from '../_shared/onboarding.ts';
import type { Choices, Reveal } from '../_shared/onboarding.ts';
import { authenticate } from '../_shared/session.ts';
import { stateView } from '../_shared/state.ts';
import { dayOffers } from '../_shared/today.ts';

/** Claude calls per player for the reveal, lifetime (architecture §8). */
const AI_CAP = 3;

async function reveal(userId: string, choices: Choices): Promise<Reveal> {
  const fallback = templateReveal(choices);
  if (!claudeConfigured()) return fallback;
  let callId: string;
  try {
    callId = one(await db()<{ id: string }[]>`select levelmeup.reserve_ai_call(${userId}::uuid, 'onboarding', ${REVEAL_MODEL}, ${AI_CAP}) as id`).id;
  } catch (error) {
    if (lmuCode(error) === 'ai_cap') return fallback;
    throw error;
  }
  const call = await writeReveal(revealFacts(choices));
  const parsed = 'value' in call ? parseReveal(call.value) : null;
  const status = parsed !== null ? 'ok' : 'error' in call ? 'failed' : 'fallback';
  await db()`select levelmeup.finish_ai_call(${callId}::bigint, ${status}, ${'value' in call ? call.inputTokens : null}::int,
    ${'value' in call ? call.outputTokens : null}::int, null, ${'error' in call ? call.error : parsed === null ? 'invalid reveal' : null})`;
  return parsed ?? fallback;
}

Deno.serve(async (req) => {
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
    const { snapshot, history } = await db().begin(async (tx) => {
      const j = (value: unknown) => tx.json(value as postgres.JSONValue);
      // Day 1 starts on the database clock, the one every later check uses.
      const { now } = one(await tx<{ now: Date }[]>`select now() as now`);
      const args = startArgs(choices, words, now.getTime(), LIBRARY);
      if (existing === null) {
        await tx`select levelmeup.start_player(${player.userId}::uuid, ${j(args.profile)}::jsonb, ${j(args.character)}::jsonb,
          ${j(args.ladders)}::jsonb, ${j(args.day)}::jsonb)`;
      } else {
        await tx`select levelmeup.restart_player(${player.userId}::uuid, ${j(args.profile)}::jsonb, ${j(args.character)}::jsonb,
          ${j(args.ladders)}::jsonb, ${j(args.day)}::jsonb)`;
      }
      const snapshot = (await loadSnapshot(tx, player.userId))!;
      return { snapshot, history: await loadHistory(tx, player.userId, snapshot.profile.book) };
    });
    return json(201, { reveal: words, state: stateView(snapshot, dayOffers(snapshot, LIBRARY), history) });
  } catch (error) {
    const code = lmuCode(error);
    if (code === 'already_started' || code === 'locked') return problemResponse(problem(409, code));
    // Two redos at once: the second waited on a character the first replaced (M5 review). Trying again works.
    if (code === 'not_started' && redo) return problemResponse(problem(503, 'busy', 'try again'));
    console.error('lmu-onboarding failed', error);
    return problemResponse(problem(500, 'internal'));
  }
});
