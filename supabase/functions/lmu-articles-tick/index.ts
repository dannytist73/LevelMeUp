// POST /functions/v1/lmu-articles-tick — the article pipeline's heartbeat (architecture §5.2): Supabase Cron calls it
// every 30 minutes, and the owner's `npm run articles -- tick` on demand. It answers only to the tick secret, compared
// in constant time (M8a decision 8): players get a 401 like anyone else. Off until LMU_TICK_SECRET and
// LMU_ANTHROPIC_API_KEY are both set.
import { claudeConfigured } from '../_shared/claude.ts';
import { db } from '../_shared/db.ts';
import { json, problem, problemResponse } from '../_shared/http.ts';
import { tickAllowed } from '../_shared/articles/auth.ts';
import { claudeBatches } from '../_shared/articles/batches.ts';
import { tick } from '../_shared/articles/pipeline.ts';
import { sqlStore } from '../_shared/articles/store.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return problemResponse(problem(405, 'method_not_allowed'));
  if (!tickAllowed(req.headers.get('x-lmu-tick'), Deno.env.get('LMU_TICK_SECRET') ?? '')) return problemResponse(problem(401, 'unauthorized'));
  if (!claudeConfigured()) return problemResponse(problem(503, 'off'));
  try {
    return json(200, await tick(sqlStore(db()), claudeBatches(), Date.now()));
  } catch (error) {
    console.error('lmu-articles-tick failed', error);
    return problemResponse(problem(500, 'internal'));
  }
});
