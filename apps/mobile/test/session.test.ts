/** @jest-environment node */
import { AuthApiError } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureSession, sessionAlive } from '../src/auth/session.ts';

function client(auth: Record<string, jest.Mock>) {
  return { auth } as unknown as SupabaseClient;
}

const withSession = (session: unknown) => jest.fn(async () => ({ data: { session }, error: null }));

describe('the guest sign-in', () => {
  it('a phone that cannot keep a sign-in makes no guest (M7b decision 8)', async () => {
    const signInAnonymously = jest.fn(async () => ({ data: {}, error: null }));
    const empty = { getSession: withSession(null), signInAnonymously };
    expect(await ensureSession(client(empty), () => true, async () => false)).toBe('storage_failed');
    expect(signInAnonymously).not.toHaveBeenCalled();
    expect(await ensureSession(client(empty), () => true, async () => true)).toBe('signed_in');
    // Only a new guest is checked: a session already there, or no guest allowed, never asks.
    const canStore = jest.fn(async () => false);
    expect(await ensureSession(client({ getSession: withSession({}), signInAnonymously }), () => true, canStore)).toBe('signed_in');
    expect(await ensureSession(client(empty), () => false, canStore)).toBe('no_session');
    expect(canStore).not.toHaveBeenCalled();
  });

  it('uses the session there is, without signing in again', async () => {
    const signInAnonymously = jest.fn();
    expect(await ensureSession(client({ getSession: withSession({}), signInAnonymously }), () => true)).toBe('signed_in');
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it('signs in a new guest only when the phone holds nothing (M4 code review)', async () => {
    const signInAnonymously = jest.fn(async () => ({ data: {}, error: null }));
    expect(await ensureSession(client({ getSession: withSession(null), signInAnonymously }), () => true)).toBe('signed_in');
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
    expect(await ensureSession(client({ getSession: withSession(null), signInAnonymously }), () => false)).toBe('no_session');
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('a session that cannot be read right now is kept: offline, no new guest', async () => {
    const signInAnonymously = jest.fn();
    const throwing = jest.fn(async () => {
      throw new Error('Keystore busy');
    });
    expect(await ensureSession(client({ getSession: throwing, signInAnonymously }), () => true)).toBe('offline');
    const erroring = jest.fn(async () => ({ data: { session: null }, error: new Error('storage') }));
    expect(await ensureSession(client({ getSession: erroring, signInAnonymously }), () => true)).toBe('offline');
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it('a failed sign-in (offline) changes nothing', async () => {
    const auth = { getSession: withSession(null), signInAnonymously: jest.fn(async () => ({ data: {}, error: new Error('Network request failed') })) };
    expect(await ensureSession(client(auth), () => true)).toBe('offline');
  });
});

describe('is the sign-in really gone? (asked before wiping anything on session_ended)', () => {
  const refreshing = (error: unknown) => client({ refreshSession: jest.fn(async () => ({ data: {}, error })) });

  it('yes only when Auth refuses the refresh outright', async () => {
    for (const status of [400, 401, 403, 404]) {
      expect(await sessionAlive(refreshing(new AuthApiError('Invalid Refresh Token', status, 'refresh_token_not_found')))).toBe(false);
    }
  });

  it('no when the refresh works, fails on the network, throws, or Auth has a server error', async () => {
    expect(await sessionAlive(refreshing(null))).toBe(true);
    expect(await sessionAlive(refreshing(new Error('Network request failed')))).toBe(true);
    expect(await sessionAlive(refreshing(new AuthApiError('upstream', 503, undefined)))).toBe(true);
    expect(await sessionAlive(client({ refreshSession: jest.fn(async () => { throw new Error('vault'); }) }))).toBe(true);
  });
});
