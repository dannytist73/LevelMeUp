// POST /functions/v1/lmu-plus {} — M13: asks RevenueCat what the signed-in player bought on Google Play and stores it
// (after a purchase or a restore, or when the phone's RevenueCat and the server disagree). The phone's word is never
// taken: only RevenueCat's answer to our secret key is stored (plan decision 1). Returns { plus } as state.plus has it.
// lmu_service only calls set_play_plus; the grants are read as the player (review: lmu_service reads no table).
import { asPlayer, asService, db, one } from '../_shared/db.ts';
import { isProblem, json, problem, problemResponse, readJson } from '../_shared/http.ts';
import { plusView } from '../_shared/plus.ts';
import type { EntitlementRow } from '../_shared/plus.ts';
import { refreshPlay, revenueCatKey } from '../_shared/revenuecat.ts';
import { authenticate } from '../_shared/session.ts';

Deno.serve(async (req) => {
  const player = await authenticate(req);
  if (isProblem(player)) return problemResponse(player);
  const body = await readJson(req, 1024);
  if (isProblem(body)) return problemResponse(body);
  const key = revenueCatKey();
  if (key === null) return problemResponse(problem(503, 'not_configured', 'purchases are not set up yet'));

  try {
    const stored = await refreshPlay(db(), key, player.userId);
    if (stored === 'unavailable') return problemResponse(problem(503, 'store_unavailable', 'try again'));
    if (stored === 'not_started') return problemResponse(problem(404, 'not_started'));
    const plus = await db().begin(async (tx) => {
      await asPlayer(tx, player.userId);
      const rows = await tx<EntitlementRow[]>`
        select source, product, starts_at, ends_at, trial, will_renew, manage_url, checked_at
        from levelmeup.entitlements where user_id = ${player.userId}`;
      const { now } = one(await tx<{ now: Date }[]>`select now() as now`);
      await asService(tx);
      return plusView(rows, now);
    });
    return json(200, { plus });
  } catch (error) {
    console.error('lmu-plus failed', error);
    return problemResponse(problem(500, 'internal'));
  }
});
