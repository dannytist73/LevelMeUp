// POST /functions/v1/lmu-account-delete { "confirm": "DELETE" } — removes every LevelMeUp row of the player. The sign-in
// itself is deleted only when it is LevelMeUp's (it had a character) and Auth says it is still anonymous: a signed-in
// account, or a wedding guest's, may belong to the wedding site too (M3 plan, decision 9; owner question 2).
import { db, one } from '../_shared/db.ts';
import { isObject, isProblem, json, problem, problemResponse, readJson } from '../_shared/http.ts';
import { authenticate } from '../_shared/session.ts';

async function deleteSignIn(userId: string): Promise<boolean> {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return false;
  const res = await fetch(`${url}/auth/v1/admin/users/${userId}`, { method: 'DELETE', headers: { apikey: key, authorization: `Bearer ${key}` } });
  return res.ok || res.status === 404;
}

Deno.serve(async (req) => {
  const player = await authenticate(req);
  if (isProblem(player)) return problemResponse(player);
  const body = await readJson(req);
  if (isProblem(body)) return problemResponse(body);
  if (!isObject(body) || body.confirm !== 'DELETE') return problemResponse(problem(400, 'confirm', 'send { "confirm": "DELETE" }'));

  try {
    const { counts } = one(await db()<{ counts: Record<string, number> }[]>`select levelmeup.delete_player(${player.userId}::uuid) as counts`);
    if (!player.anonymous || counts.profile !== 1) return json(200, { deleted: counts, signIn: 'kept' });
    if (!(await deleteSignIn(player.userId))) {
      return problemResponse(problem(502, 'sign_in_not_deleted', 'the game data is gone; the sign-in could not be removed'));
    }
    return json(200, { deleted: counts, signIn: 'deleted' });
  } catch (error) {
    console.error('lmu-account-delete failed', error);
    return problemResponse(problem(500, 'internal'));
  }
});
