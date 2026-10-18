// POST /functions/v1/lmu-plus {} — M13: asks RevenueCat what the signed-in player bought on Google Play and stores it
// (after a purchase or a restore, or when the phone's RevenueCat and the server disagree). The phone's word is never
// taken: only RevenueCat's answer to our secret key is stored (plan decision 1). Returns { plus } as state.plus has it.
import { asPlayer, asService, db, one } from '../_shared/db.ts';
import { isProblem, json, problem, problemResponse, readJson } from '../_shared/http.ts';
import { plusView } from '../_shared/plus.ts';
import type { EntitlementRow } from '../_shared/plus.ts';
import { askRevenueCat, revenueCatKey } from '../_shared/revenuecat.ts';
import { authenticate } from '../_shared/session.ts';

Deno.serve(async (req) => {
  const player = await authenticate(req);
  if (isProblem(player)) return problemResponse(player);
  const body = await readJson(req, 1024);
  if (isProblem(body)) return problemResponse(body);
  const key = revenueCatKey();
  if (key === null) return problemResponse(problem(503, 'not_configured', 'purchases are not set up yet'));

  const play = await askRevenueCat(key, player.userId);
  if (play === 'unavailable') return problemResponse(problem(503, 'store_unavailable', 'try again'));
  try {
    const plus = await db().begin(async (tx) => {
      const { started } = one(await tx<{ started: boolean }[]>`
        select exists (select 1 from levelmeup.profiles where user_id = ${player.userId}) as started`);
      if (!started) return null;
      await tx`select levelmeup.set_play_plus(${player.userId}::uuid, ${play?.product ?? null}, ${play?.endsAt ?? null}::timestamptz,
        ${play?.trial ?? null}, ${play?.willRenew ?? null}, ${play?.manageUrl ?? null})`;
      await asPlayer(tx, player.userId);
      const rows = await tx<EntitlementRow[]>`
        select source, product, starts_at, ends_at, trial, will_renew, manage_url from levelmeup.entitlements where user_id = ${player.userId}`;
      const { now } = one(await tx<{ now: Date }[]>`select now() as now`);
      await asService(tx);
      return plusView(rows, now);
    });
    if (plus === null) return problemResponse(problem(404, 'not_started'));
    return json(200, { plus });
  } catch (error) {
    console.error('lmu-plus failed', error);
    return problemResponse(problem(500, 'internal'));
  }
});
