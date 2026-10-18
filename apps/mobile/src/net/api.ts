// The app's calls to LevelMeUp's Edge Functions. No React Native imports: the live test suite runs this exact module in
// Node against the deployed functions (supabase/tests/live/client.test.ts).
import { FunctionRegion, FunctionsHttpError } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DeleteResponse, OnboardingBody, OnboardingResponse, PhoneEvent, PlusResponse, SyncResponse } from '../game/types.ts';

/** `status 0` with `code 'network'` covers no connection, timeouts and relay failures: try again later. */
export type Call<T> = { ok: true; body: T } | { ok: false; status: number; code: string };

const TIMEOUT_MS = { 'lmu-sync': 20_000, 'lmu-onboarding': 30_000, 'lmu-account-delete': 20_000, 'lmu-plus': 20_000 } as const;
export type FunctionName = keyof typeof TIMEOUT_MS;

/**
 * M9b decision 2: run next to the database (Singapore). By default the functions run nearest the phone (Seoul, from
 * Manila), and each of a sync's ~90 database round trips then crosses that distance: 11–15 s a sync.
 */
export const FUNCTION_REGION = FunctionRegion.ApSoutheast1;
/** M9b decision 5: every call names the app's version, so the server can ask an old app to update. */
export const APP_HEADER = 'x-lmu-app';

export async function invoke<T>(client: SupabaseClient, name: FunctionName, body: unknown, appVersion: string | null): Promise<Call<T>> {
  try {
    const { data, error } = await client.functions.invoke(name, {
      body: body as Record<string, unknown>, timeout: TIMEOUT_MS[name], region: FUNCTION_REGION,
      headers: appVersion === null ? {} : { [APP_HEADER]: appVersion },
    });
    if (error === null) return { ok: true, body: data as T };
    if (error instanceof FunctionsHttpError) {
      const res = error.context as Response;
      const parsed: unknown = await res.json().catch(() => null);
      const code = typeof (parsed as { error?: unknown } | null)?.error === 'string' ? (parsed as { error: string }).error : `http_${res.status}`;
      return { ok: false, status: res.status, code };
    }
    return { ok: false, status: 0, code: 'network' };
  } catch {
    return { ok: false, status: 0, code: 'network' };
  }
}

export function makeApi(client: SupabaseClient, appVersion: string | null) {
  return {
    sync: (body: { timeZone: string; events: readonly PhoneEvent[]; have?: readonly string[]; want?: readonly string[] }) =>
      invoke<SyncResponse>(client, 'lmu-sync', body, appVersion),
    onboarding: (body: OnboardingBody) => invoke<OnboardingResponse>(client, 'lmu-onboarding', body, appVersion),
    deleteAccount: () => invoke<DeleteResponse>(client, 'lmu-account-delete', { confirm: 'DELETE' }, appVersion),
    /** M13: the server asks RevenueCat what the player bought and stores it. */
    plus: () => invoke<PlusResponse>(client, 'lmu-plus', {}, appVersion),
  };
}

export type Api = ReturnType<typeof makeApi>;
