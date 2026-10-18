// M13: the two RevenueCat calls, with our secret key (LMU_REVENUECAT_SECRET, a Supabase secret; never in the app). The
// player's RevenueCat id is their LevelMeUp id: the phone logs in to RevenueCat with it (src/plus/purchases.ts).
import { REVENUECAT_API, playFromSubscriber } from './plus.ts';
import type { PlayPlus } from './plus.ts';

const TIMEOUT_MS = 10_000;

/** The secret key, or null while RevenueCat isn't set up (owner step 5). */
export function revenueCatKey(): string | null {
  const key = Deno.env.get('LMU_REVENUECAT_SECRET');
  return key ? key : null;
}

const headers = (key: string) => ({ authorization: `Bearer ${key}`, accept: 'application/json' });

/** What RevenueCat says the player holds: a Play Plus purchase, null for none, or 'unavailable' when it can't say. */
export async function askRevenueCat(key: string, userId: string): Promise<PlayPlus | null | 'unavailable'> {
  try {
    const res = await fetch(`${REVENUECAT_API}/subscribers/${encodeURIComponent(userId)}`, {
      headers: headers(key), signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return 'unavailable';
    return playFromSubscriber(await res.json());
  } catch {
    return 'unavailable';
  }
}

/** Deletes the player's RevenueCat customer (their purchase history there). 404: there was none. */
export async function deleteRevenueCatCustomer(key: string, userId: string): Promise<boolean> {
  try {
    const res = await fetch(`${REVENUECAT_API}/subscribers/${encodeURIComponent(userId)}`, {
      method: 'DELETE', headers: headers(key), signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}
