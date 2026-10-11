/** @jest-environment node */
import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { REDIRECT_URL, linkGoogle, problemOf, readAccount, readCallback, signInWithGoogle } from '../src/auth/google.ts';

function fakeClient(over: Record<string, jest.Mock> = {}) {
  const auth = {
    linkIdentity: jest.fn(async () => ({ data: { provider: 'google', url: 'https://auth.example/authorize?a=1' }, error: null })),
    signInWithOAuth: jest.fn(async () => ({ data: { provider: 'google', url: 'https://auth.example/authorize?a=2' }, error: null })),
    exchangeCodeForSession: jest.fn(async () => ({ data: {}, error: null })),
    getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
    ...over,
  };
  return { auth } as unknown as SupabaseClient & { auth: typeof auth };
}
const cameBack = (url: string) => jest.fn(async () => ({ type: 'success', url }));

describe('the redirect', () => {
  it.each([
    ['levelmeup://auth-callback?code=abc', { code: 'abc' }],
    ['levelmeup://auth-callback#code=abc', { code: 'abc' }],
    ['levelmeup://auth-callback?error=server_error&error_code=identity_already_exists&error_description=x', { error: 'identity_already_exists' }],
    ['levelmeup://auth-callback#error=access_denied', { error: 'access_denied' }],
    ['levelmeup://auth-callback', { error: 'no_code' }],
  ])('%s', (url, expected) => {
    expect(readCallback(url)).toEqual(expected);
  });

  it('is told to the player plainly', () => {
    expect(problemOf('identity_already_exists')).toBe('taken');
    expect(problemOf('email_exists')).toBe('taken');
    expect(problemOf('user_already_exists')).toBe('taken');
    expect(problemOf('access_denied')).toBe('cancelled');
    expect(problemOf('anything else')).toBe('failed');
  });
});

describe('saving with Google', () => {
  it('links Google to the signed-in guest: the browser page, the code, the session', async () => {
    const client = fakeClient();
    const openAuth = cameBack('levelmeup://auth-callback?code=abc');
    expect(await linkGoogle(client, openAuth)).toEqual({ ok: true });
    expect(client.auth.linkIdentity).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: REDIRECT_URL, skipBrowserRedirect: true } });
    expect(openAuth).toHaveBeenCalledWith('https://auth.example/authorize?a=1', REDIRECT_URL);
    expect(client.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc');
  });

  it('a closed page is "cancelled", and nothing is exchanged', async () => {
    const client = fakeClient();
    expect(await linkGoogle(client, jest.fn(async () => ({ type: 'cancel' })))).toEqual({ ok: false, code: 'cancelled' });
    expect(client.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('an account already in use comes back in the redirect', async () => {
    expect(await linkGoogle(fakeClient(), cameBack('levelmeup://auth-callback?error_code=identity_already_exists')))
      .toEqual({ ok: false, code: 'taken' });
  });

  it('no connection is "network"; anything else Auth refuses is "failed"', async () => {
    const offline = fakeClient({
      linkIdentity: jest.fn(async () => ({ data: { provider: 'google', url: null }, error: new AuthRetryableFetchError('fetch failed', 0) })),
    });
    expect(await linkGoogle(offline, cameBack('x'))).toEqual({ ok: false, code: 'network' });
    const disabled = fakeClient({
      linkIdentity: jest.fn(async () => ({ data: { provider: 'google', url: null }, error: new AuthApiError('Manual linking is disabled', 404, 'manual_linking_disabled') })),
    });
    expect(await linkGoogle(disabled, cameBack('x'))).toEqual({ ok: false, code: 'failed' });
    const thrown = fakeClient({ exchangeCodeForSession: jest.fn(async () => { throw new Error('socket closed'); }) });
    expect(await linkGoogle(thrown, cameBack('levelmeup://auth-callback?code=abc'))).toEqual({ ok: false, code: 'network' });
  });

  it('signing in uses the same page with signInWithOAuth', async () => {
    const client = fakeClient();
    expect(await signInWithGoogle(client, cameBack('levelmeup://auth-callback?code=def'))).toEqual({ ok: true });
    expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: REDIRECT_URL, skipBrowserRedirect: true } });
    expect(client.auth.exchangeCodeForSession).toHaveBeenCalledWith('def');
  });
});

describe('the account', () => {
  it.each([
    [null, { kind: 'none' }],
    [{ user: { is_anonymous: true, identities: [] } }, { kind: 'guest' }],
    [{ user: { is_anonymous: false, email: 'rin@example.com', identities: [{ provider: 'google' }] } }, { kind: 'saved', email: 'rin@example.com' }],
    [{ user: { is_anonymous: false, email: 'rin@example.com', app_metadata: { providers: ['anonymous', 'google'] } } }, { kind: 'saved', email: 'rin@example.com' }],
    // Never tell a player they are saved without a Google identity (review).
    [{ user: { is_anonymous: false, email: 'rin@example.com', identities: [{ provider: 'email' }] } }, { kind: 'guest' }],
    [{ user: { email: 'rin@example.com' } }, { kind: 'guest' }],
  ])('%j', async (session, account) => {
    const client = fakeClient({ getSession: jest.fn(async () => ({ data: { session }, error: null })) });
    expect(await readAccount(client)).toEqual(account);
  });
});
