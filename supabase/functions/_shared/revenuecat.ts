// M13: the RevenueCat calls, with our secret key (LMU_REVENUECAT_SECRET, a Supabase secret; never in the app). The
// player's RevenueCat id is their LevelMeUp id: the phone logs in to RevenueCat with it (src/plus/purchases.ts).
import type { Sql } from './db.ts';
import { lmuCode } from './db.ts';
import { REVENUECAT_API, playFromSubscriber } from './plus.ts';
import type { PlayPlus } from './plus.ts';

const TIMEOUT_MS = 10_000;

/** The secret key, or null while RevenueCat isn't set up (owner step 5). */
export function revenueCatKey(): string | null {
  const key = Deno.env.get('LMU_REVENUECAT_SECRET');
  return key ? key : null;
}

const headers = (key: string) => ({ authorization: `Bearer ${key}`, accept: 'application/json' });

/** What RevenueCat says the player holds: a Play Plus purchase, null for none, `unknown`, or `unavailable`. */
export async function askRevenueCat(key: string, userId: string, timeoutMs = TIMEOUT_MS): Promise<PlayPlus | null | 'unknown' | 'unavailable'> {
  try {
    const res = await fetch(`${REVENUECAT_API}/subscribers/${encodeURIComponent(userId)}`, {
      headers: headers(key), signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return 'unavailable';
    return playFromSubscriber(await res.json());
  } catch {
    return 'unavailable';
  }
}

/**
 * Asks RevenueCat and stores what it says (set_play_plus, as lmu_service). `kept`: an answer we don't understand changed
 * nothing (review: never end a paid row on a strange reply).
 */
export async function refreshPlay(
  sql: Sql, key: string, userId: string, timeoutMs = TIMEOUT_MS,
): Promise<'stored' | 'kept' | 'unavailable' | 'not_started'> {
  const play = await askRevenueCat(key, userId, timeoutMs);
  if (play === 'unavailable') return 'unavailable';
  if (play === 'unknown') return 'kept';
  try {
    await sql`select levelmeup.set_play_plus(${userId}::uuid, ${play?.product ?? null}, ${play?.endsAt ?? null}::timestamptz,
      ${play?.trial ?? null}, ${play?.willRenew ?? null}, ${play?.manageUrl ?? null})`;
    return 'stored';
  } catch (error) {
    if (lmuCode(error) === 'not_started') return 'not_started';
    throw error;
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

/**
 * After a character is deleted: its RevenueCat customer goes too, or, when RevenueCat can't be reached, its id waits
 * in levelmeup.revenuecat_forget for the cron's tick (review: a RevenueCat outage never blocks a deletion).
 */
export async function forgetCustomer(sql: Sql, key: string | null, userId: string): Promise<void> {
  if (key === null) return;
  if (await deleteRevenueCatCustomer(key, userId)) return;
  await sql`select levelmeup.revenuecat_forget_add(${userId}::uuid)`;
}

/** The cron's tick: tries the waiting RevenueCat deletions again, a few at a time. */
export async function retryForgotten(sql: Sql, key: string | null, limit = 20): Promise<number> {
  if (key === null) return 0;
  const due = await sql<{ id: string }[]>`select levelmeup.revenuecat_forget_due(${limit}) as id`;
  let done = 0;
  for (const { id } of due) {
    if (await deleteRevenueCatCustomer(key, id)) {
      await sql`select levelmeup.revenuecat_forget_done(${id}::uuid)`;
      done++;
    } else {
      await sql`select levelmeup.revenuecat_forget_add(${id}::uuid)`;
    }
  }
  return done;
}
