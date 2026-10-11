// The app's calls to LevelMeUp's Edge Functions. No React Native imports: the live test suite runs this exact module in
// Node against the deployed functions (supabase/tests/live/client.test.ts).
import { FunctionsHttpError } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DeleteResponse, OnboardingBody, OnboardingResponse, PhoneEvent, SyncResponse } from '../game/types.ts';

/** `status 0` with `code 'network'` covers no connection, timeouts and relay failures: try again later. */
export type Call<T> = { ok: true; body: T } | { ok: false; status: number; code: string };

const TIMEOUT_MS = { 'lmu-sync': 20_000, 'lmu-onboarding': 30_000, 'lmu-account-delete': 20_000 } as const;
export type FunctionName = keyof typeof TIMEOUT_MS;

export async function invoke<T>(client: SupabaseClient, name: FunctionName, body: unknown): Promise<Call<T>> {
  try {
    const { data, error } = await client.functions.invoke(name, { body: body as Record<string, unknown>, timeout: TIMEOUT_MS[name] });
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

export function makeApi(client: SupabaseClient) {
  return {
    sync: (body: { timeZone: string; events: readonly PhoneEvent[] }) => invoke<SyncResponse>(client, 'lmu-sync', body),
    onboarding: (body: OnboardingBody) => invoke<OnboardingResponse>(client, 'lmu-onboarding', body),
    deleteAccount: () => invoke<DeleteResponse>(client, 'lmu-account-delete', { confirm: 'DELETE' }),
  };
}

export type Api = ReturnType<typeof makeApi>;
