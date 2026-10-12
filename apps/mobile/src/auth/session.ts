// The guest sign-in (architecture §4.4): anonymous, made the first time the app needs to talk to the server.
import { isAuthApiError } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * - `signed_in`: there is a session (now or from before).
 * - `offline`: the session couldn't be read or made right now; try again later, change nothing.
 * - `no_session`: the session is cleanly gone (Auth removed it after refusing a refresh, or its key is gone for good)
 *   and a new guest isn't allowed: this phone holds a character or unsent actions (M4 code review). Retrying can't
 *   bring it back; the player decides whether to start again.
 * - `storage_failed` (M7b decision 8): a new guest was due, but this phone can't keep a sign-in; none was made.
 *
 * `allowNewGuest` is asked at the moment of signing in, so a sync abandoned meanwhile can't make a guest.
 */
export type SessionState = 'signed_in' | 'offline' | 'no_session' | 'storage_failed';

export async function ensureSession(client: SupabaseClient, allowNewGuest: () => boolean): Promise<SessionState> {
  let session: unknown;
  try {
    const { data, error } = await client.auth.getSession();
    if (error !== null) return 'offline';
    session = data.session;
  } catch {
    return 'offline'; // the stored session couldn't be read (a vault error): keep it
  }
  if (session !== null) return 'signed_in';
  if (!allowNewGuest()) return 'no_session';
  const { error } = await client.auth.signInAnonymously();
  return error === null ? 'signed_in' : 'offline';
}

/**
 * Asked before anything is wiped on `session_ended` (roadmap, "Carried forward from M3"): false only when Auth itself
 * refuses to refresh the session. A network error or an Auth outage is never treated as a deleted account.
 */
export async function sessionAlive(client: SupabaseClient): Promise<boolean> {
  try {
    const { error } = await client.auth.refreshSession();
    if (error === null) return true;
    return !(isAuthApiError(error) && [400, 401, 403, 404].includes(error.status));
  } catch {
    return true;
  }
}
