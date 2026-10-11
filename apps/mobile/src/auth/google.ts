// "Save your character" and "Sign in with Google" (spec §1.1, architecture §4.4; owner decision 1, 2026-10-11: the
// browser page). Supabase Auth runs Google's sign-in in a browser tab and sends the player back to
// levelmeup://auth-callback with a one-time code (PKCE), which the app trades for the session. Linking keeps the
// guest's user id, so the character and every row stay where they are.
import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import type { OAuthResponse, SupabaseClient } from '@supabase/supabase-js';

export const REDIRECT_URL = 'levelmeup://auth-callback';

/** expo-web-browser's openAuthSessionAsync, or a fake in tests. */
export type OpenAuth = (url: string, redirectUrl: string) => Promise<{ type: string; url?: string }>;
export type GoogleProblem = 'cancelled' | 'taken' | 'network' | 'failed';
export type GoogleResult = { ok: true } | { ok: false; code: GoogleProblem };
/** `saved`: any sign-in that isn't a guest's (in LevelMeUp, Google). */
export type Account = { kind: 'none' } | { kind: 'guest' } | { kind: 'saved'; email: string | null };

/** The one-time code from the redirect, or the error Supabase Auth put there instead (query or fragment). */
export function readCallback(url: string): { code: string } | { error: string } {
  const at = url.search(/[?#]/);
  const params = new URLSearchParams(at < 0 ? '' : url.slice(at + 1).replace(/#/g, '&'));
  const code = params.get('code');
  if (code !== null && code !== '') return { code };
  return { error: params.get('error_code') ?? params.get('error') ?? 'no_code' };
}

/** Auth's error codes as the player hears them. */
export function problemOf(code: string): GoogleProblem {
  if (code === 'identity_already_exists' || code === 'email_exists' || code === 'user_already_exists') return 'taken';
  if (code === 'access_denied') return 'cancelled';
  return 'failed';
}

async function viaBrowser(client: SupabaseClient, start: () => Promise<OAuthResponse>, openAuth: OpenAuth): Promise<GoogleResult> {
  try {
    const { data, error } = await start();
    if (error !== null) return { ok: false, code: isAuthRetryableFetchError(error) ? 'network' : problemOf(error.code ?? '') };
    if (data.url === null) return { ok: false, code: 'failed' };
    const result = await openAuth(data.url, REDIRECT_URL);
    if (result.type !== 'success' || result.url === undefined) return { ok: false, code: 'cancelled' };
    const back = readCallback(result.url);
    if ('error' in back) return { ok: false, code: problemOf(back.error) };
    const exchanged = await client.auth.exchangeCodeForSession(back.code);
    if (exchanged.error !== null) {
      return { ok: false, code: isAuthRetryableFetchError(exchanged.error) ? 'network' : problemOf(exchanged.error.code ?? '') };
    }
    return { ok: true };
  } catch {
    return { ok: false, code: 'network' }; // a request that threw never reached a decision
  }
}

const options = { redirectTo: REDIRECT_URL, skipBrowserRedirect: true };

/** Links Google to the signed-in guest (manual identity linking must be on in the project's Auth settings). */
export function linkGoogle(client: SupabaseClient, openAuth: OpenAuth): Promise<GoogleResult> {
  return viaBrowser(client, () => client.auth.linkIdentity({ provider: 'google', options }), openAuth);
}

/** Signs in with Google on a phone with no character: a saved character comes back with it. */
export function signInWithGoogle(client: SupabaseClient, openAuth: OpenAuth): Promise<GoogleResult> {
  return viaBrowser(client, () => client.auth.signInWithOAuth({ provider: 'google', options }), openAuth);
}

/** Who is signed in, from the stored session (no network). */
export async function readAccount(client: SupabaseClient): Promise<Account> {
  try {
    const { data } = await client.auth.getSession();
    const user = data.session?.user;
    if (user === undefined) return { kind: 'none' };
    return user.is_anonymous === true ? { kind: 'guest' } : { kind: 'saved', email: user.email ?? null };
  } catch {
    return { kind: 'none' };
  }
}
