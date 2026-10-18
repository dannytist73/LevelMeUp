// POST /functions/v1/lmu-articles-tick — the article pipeline's heartbeat (architecture §5.2): Supabase Cron calls it
// every 30 minutes, and the owner's `npm run articles -- tick` on demand. It answers only to the tick secret, compared
// in constant time (M8a decision 8): players get a 401 like anyone else. Off until LMU_TICK_SECRET and
// LMU_ANTHROPIC_API_KEY are both set.
import { claudeConfigured } from '../_shared/claude.ts';
import { retryForgotten, revenueCatKey } from '../_shared/revenuecat.ts';
import { db } from '../_shared/db.ts';
import { isObject, isProblem, json, problem, problemResponse, readJson } from '../_shared/http.ts';
import { tickAllowed } from '../_shared/articles/auth.ts';
import { claudeBatches } from '../_shared/articles/batches.ts';
import { claudeDecks } from '../_shared/articles/deckCalls.ts';
import { tick } from '../_shared/articles/pipeline.ts';
import { sqlStore } from '../_shared/articles/store.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return problemResponse(problem(405, 'method_not_allowed'));
  if (!tickAllowed(req.headers.get('x-lmu-tick'), Deno.env.get('LMU_TICK_SECRET') ?? '')) return problemResponse(problem(401, 'unauthorized'));
  // M13: RevenueCat customers of deleted characters that RevenueCat couldn't take at the time; never stops the tick.
  await retryForgotten(db(), revenueCatKey()).catch((error) => console.error('lmu-articles-tick: RevenueCat retries failed', error));
  if (!claudeConfigured()) return problemResponse(problem(503, 'off'));
  const body = await readJson(req);
  if (isProblem(body)) return problemResponse(body);
  // The cron sends {}; the owner's manual tick sends { nights: false } so it never queues a night's articles.
  const nights = !(isObject(body) && body.nights === false);
  try {
    // M11: the cron's ticks also write the Story Decks; the owner's manual tick never does (it spends only what was queued).
    return json(200, await tick(sqlStore(db()), claudeBatches(), Date.now(), { nights, decks: nights ? claudeDecks() : undefined }));
  } catch (error) {
    console.error('lmu-articles-tick failed', error);
    return problemResponse(problem(500, 'internal'));
  }
});
