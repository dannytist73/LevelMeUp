// The player behind a request, confirmed twice: the gateway verifies the JWT (verify_jwt = true, and the CLI guard
// refuses deploys without it), then Supabase Auth itself confirms the session here. So a forged token is refused
// even if the gateway check were ever off, and a deleted player's token stops working at once.
import { playerFromAuthHeader } from './auth.ts';
import type { Player } from './auth.ts';
import { isObject, problem } from './http.ts';
import type { Problem } from './http.ts';

export async function authenticate(req: Request): Promise<Player | Problem> {
  const header = req.headers.get('authorization');
  const claimed = playerFromAuthHeader(header, Date.now());
  if ('code' in claimed) return claimed;
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) return problem(500, 'internal');
  let res: Response;
  try {
    res = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anonKey, authorization: header! } });
  } catch {
    return problem(503, 'auth_unavailable', 'try again');
  }
  if (res.status >= 500) return problem(503, 'auth_unavailable', 'try again');
  if (!res.ok) return problem(401, 'session_ended');
  const user: unknown = await res.json();
  if (!isObject(user) || user.id !== claimed.userId) return problem(401, 'session_ended');
  return { userId: claimed.userId, anonymous: user.is_anonymous === true };
}
