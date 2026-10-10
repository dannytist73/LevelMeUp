/** @jest-environment node */
import { AuthApiError } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureSession, sessionAlive } from '../src/auth/session.ts';

function client(auth: Record<string, jest.Mock>) {
  return { auth } as unknown as SupabaseClient;
}

describe('the guest sign-in', () => {
  it('signs in anonymously only when there is no session', async () => {
    const signInAnonymously = jest.fn(async () => ({ data: {}, error: null }));
    expect(await ensureSession(client({ getSession: jest.fn(async () => ({ data: { session: {} } })), signInAnonymously }))).toBe(true);
    expect(signInAnonymously).not.toHaveBeenCalled();
    expect(await ensureSession(client({ getSession: jest.fn(async () => ({ data: { session: null } })), signInAnonymously }))).toBe(true);
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('reports false when signing in fails (offline): the app stays local-only and retries', async () => {
    const auth = {
      getSession: jest.fn(async () => ({ data: { session: null } })),
      signInAnonymously: jest.fn(async () => ({ data: {}, error: new Error('Network request failed') })),
    };
    expect(await ensureSession(client(auth))).toBe(false);
  });
});

describe('is the sign-in really gone? (asked before wiping anything on session_ended)', () => {
  const refreshing = (error: unknown) => client({ refreshSession: jest.fn(async () => ({ data: {}, error })) });

  it('yes only when Auth refuses the refresh outright', async () => {
    for (const status of [400, 401, 403, 404]) {
      expect(await sessionAlive(refreshing(new AuthApiError('Invalid Refresh Token', status, 'refresh_token_not_found')))).toBe(false);
    }
  });

  it('no when the refresh works, fails on the network, or Auth has a server error', async () => {
    expect(await sessionAlive(refreshing(null))).toBe(true);
    expect(await sessionAlive(refreshing(new Error('Network request failed')))).toBe(true);
    expect(await sessionAlive(refreshing(new AuthApiError('upstream', 503, undefined)))).toBe(true);
  });
});
