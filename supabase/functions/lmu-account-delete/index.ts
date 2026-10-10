// POST /functions/v1/lmu-account-delete { "confirm": "DELETE" } — removes every LevelMeUp row of the player. The sign-in
// itself is deleted only when it is LevelMeUp's (it has a character) and Auth says it is still anonymous: a signed-in
// account, or a wedding guest's, may belong to the wedding site too (M3 plan, decision 9; owner question 2).
// The sign-in goes first, so a failure leaves everything in place for a retry; deleting it removes every LevelMeUp
// row (each table cascades from auth.users), and delete_player then sweeps whatever remains.
import { asPlayer, asService, db, one } from '../_shared/db.ts';
import { isObject, isProblem, json, problem, problemResponse, readJson } from '../_shared/http.ts';
import { authenticate } from '../_shared/session.ts';

type Counts = Record<string, number>;

/** What the player has, by the same names delete_player reports. */
async function countRows(userId: string): Promise<Counts> {
  return db().begin(async (tx) => {
    await asPlayer(tx, userId);
    const row = one(await tx<Counts[]>`
      select (select count(*) from levelmeup.achievements_earned)::int as achievements,
        (select count(*) from levelmeup.checkins)::int as checkins, (select count(*) from levelmeup.events)::int as events,
        (select count(*) from levelmeup.xp_ledger)::int as ledger, (select count(*) from levelmeup.quest_instances)::int as quests,
        (select count(*) from levelmeup.quest_days)::int as days, (select count(*) from levelmeup.ladder_states)::int as ladders,
        (select count(*) from levelmeup.character_state)::int as character, (select count(*) from levelmeup.profiles)::int as profile`);
    await asService(tx);
    return row;
  });
}

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
    const before = await countRows(player.userId);
    if (player.anonymous && before.profile === 1) {
      if (!(await deleteSignIn(player.userId))) return problemResponse(problem(502, 'sign_in_not_deleted', 'nothing was deleted; try again'));
      await db()`select levelmeup.delete_player(${player.userId}::uuid)`;
      return json(200, { deleted: before, signIn: 'deleted' });
    }
    const { counts } = one(await db()<{ counts: Counts }[]>`select levelmeup.delete_player(${player.userId}::uuid) as counts`);
    return json(200, { deleted: counts, signIn: 'kept' });
  } catch (error) {
    console.error('lmu-account-delete failed', error);
    return problemResponse(problem(500, 'internal'));
  }
});
