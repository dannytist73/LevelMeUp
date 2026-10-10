// The player behind a request, confirmed twice: the gateway verifies the JWT (verify_jwt = true, and the CLI guard
// refuses deploys without it), then Supabase Auth itself confirms the session here. So a forged token is refused
// even if the gateway check were ever off, and a deleted player's token stops working at once.
// Only Auth's "no such session" answers mean `session_ended`; anything else is `auth_unavailable`, so the phone
// retries instead of treating a hiccup as a sign-out.
import { playerFromAuthHeader } from './auth.ts';
import type { Player } from './auth.ts';
import { isObject, problem } from './http.ts';
import type { Problem } from './http.ts';

const AUTH_TIMEOUT_MS = 5_000;
const SESSION_ENDED = new Set([401, 403, 404]);

export async function authenticate(req: Request): Promise<Player | Problem> {
  const header = req.headers.get('authorization');
  const claimed = playerFromAuthHeader(header, Date.now());
  if ('code' in claimed) return claimed;
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) return problem(500, 'internal');
  const unavailable = problem(503, 'auth_unavailable', 'try again');
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anonKey, authorization: header! },
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });
    if (SESSION_ENDED.has(res.status)) return problem(401, 'session_ended');
    if (!res.ok) return unavailable;
    const user: unknown = await res.json();
    if (!isObject(user) || user.id !== claimed.userId) return problem(401, 'session_ended');
    return { userId: claimed.userId, anonymous: user.is_anonymous === true };
  } catch {
    return unavailable;
  }
}
