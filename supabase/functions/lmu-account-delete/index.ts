// POST /functions/v1/lmu-account-delete { "confirm": "DELETE" } — removes every LevelMeUp row of the player. The sign-in
// itself is deleted only for anonymous players: a signed-in account may be shared with the wedding site (M3 plan,
// decision 9; owner question 2 settles it before M7).
import { playerFromAuthHeader } from '../_shared/auth.ts';
import { db, one } from '../_shared/db.ts';
import { isObject, isProblem, json, problem, problemResponse, readJson } from '../_shared/http.ts';

async function deleteAnonymousSignIn(userId: string): Promise<'deleted' | 'kept' | 'failed'> {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return 'failed';
  const headers = { apikey: key, authorization: `Bearer ${key}` };
  // Ask Auth, not the token: a player who linked Google a moment ago may still hold an anonymous token.
  const user = await fetch(`${url}/auth/v1/admin/users/${userId}`, { headers });
  if (user.status === 404) return 'deleted';
  if (!user.ok) return 'failed';
  const record = (await user.json()) as { is_anonymous?: boolean };
  if (record.is_anonymous !== true) return 'kept';
  const removed = await fetch(`${url}/auth/v1/admin/users/${userId}`, { method: 'DELETE', headers });
  return removed.ok || removed.status === 404 ? 'deleted' : 'failed';
}

Deno.serve(async (req) => {
  const player = playerFromAuthHeader(req.headers.get('authorization'), Date.now());
  if (isProblem(player)) return problemResponse(player);
  const body = await readJson(req);
  if (isProblem(body)) return problemResponse(body);
  if (!isObject(body) || body.confirm !== 'DELETE') return problemResponse(problem(400, 'confirm', 'send { "confirm": "DELETE" }'));

  try {
    const { counts } = one(await db()<{ counts: Record<string, number> }[]>`select levelmeup.delete_player(${player.userId}::uuid) as counts`);
    const signIn = await deleteAnonymousSignIn(player.userId);
    if (signIn === 'failed') return problemResponse(problem(502, 'sign_in_not_deleted', 'the game data is gone; try again to remove the sign-in'));
    return json(200, { deleted: counts, signIn });
  } catch (error) {
    console.error('lmu-account-delete failed', error);
    return problemResponse(problem(500, 'internal'));
  }
});
