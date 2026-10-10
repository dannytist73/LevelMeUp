// The guest sign-in (architecture §4.4): anonymous, made the first time the app needs to talk to the server.
import { isAuthApiError } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

/** True when there is a session afterwards; false when signing in failed (offline): the app stays local and retries. */
export async function ensureSession(client: SupabaseClient): Promise<boolean> {
  const { data } = await client.auth.getSession();
  if (data.session !== null) return true;
  const { error } = await client.auth.signInAnonymously();
  return error === null;
}

/**
 * Asked before anything is wiped on `session_ended` (roadmap, "Carried forward from M3"): false only when Auth itself
 * refuses to refresh the session. A network error or an Auth outage is never treated as a deleted account.
 */
export async function sessionAlive(client: SupabaseClient): Promise<boolean> {
  const { error } = await client.auth.refreshSession();
  if (error === null) return true;
  return !(isAuthApiError(error) && [400, 401, 403, 404].includes(error.status));
}
