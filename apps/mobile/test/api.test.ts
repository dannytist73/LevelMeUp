import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { invoke, makeApi } from '../src/net/api.ts';
import { toRequest } from '../src/onboarding/flow.ts';
import { READY_DRAFT } from './support/fixtures.ts';

const V = '0.2.0';

function clientReturning(result: () => Promise<{ data: unknown; error: unknown }>) {
  const calls: { name: string; options: unknown }[] = [];
  const client = {
    functions: {
      invoke: (name: string, options: unknown) => {
        calls.push({ name, options });
        return result();
      },
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

const httpError = (status: number, body: string) => new FunctionsHttpError(new Response(body, { status }));

describe('calling the server functions', () => {
  it('a success returns the body', async () => {
    const { client } = clientReturning(async () => ({ data: { state: 1 }, error: null }));
    expect(await invoke(client, 'lmu-sync', {}, V)).toEqual({ ok: true, body: { state: 1 } });
  });

  it('an error response gives its status and the server\'s code', async () => {
    const { client } = clientReturning(async () => ({ data: null, error: httpError(404, '{"error":"not_started"}') }));
    expect(await invoke(client, 'lmu-sync', {}, V)).toEqual({ ok: false, status: 404, code: 'not_started' });
  });

  it('the gateway\'s own 401 (no error field) becomes http_401', async () => {
    const { client } = clientReturning(async () => ({ data: null, error: httpError(401, '{"code":401,"message":"Invalid JWT"}') }));
    expect(await invoke(client, 'lmu-sync', {}, V)).toEqual({ ok: false, status: 401, code: 'http_401' });
  });

  it('a body that is not JSON still gives the status', async () => {
    const { client } = clientReturning(async () => ({ data: null, error: httpError(502, 'Bad gateway') }));
    expect(await invoke(client, 'lmu-sync', {}, V)).toEqual({ ok: false, status: 502, code: 'http_502' });
  });

  it.each([
    ['no connection', () => new FunctionsFetchError(new TypeError('Network request failed'))],
    ['a relay failure', () => new FunctionsRelayError({})],
  ])('%s counts as offline', async (_, makeError) => {
    const { client } = clientReturning(async () => ({ data: null, error: makeError() }));
    expect(await invoke(client, 'lmu-sync', {}, V)).toEqual({ ok: false, status: 0, code: 'network' });
  });

  it('a thrown error counts as offline', async () => {
    const { client } = clientReturning(async () => {
      throw new Error('aborted');
    });
    expect(await invoke(client, 'lmu-sync', {}, V)).toEqual({ ok: false, status: 0, code: 'network' });
  });

  it('each function has its own timeout, runs next to the database, names the app version, and gets the right body (M9b)', async () => {
    const { client, calls } = clientReturning(async () => ({ data: {}, error: null }));
    const api = makeApi(client, V);
    await api.sync({ timeZone: 'Asia/Manila', events: [] });
    await api.onboarding(toRequest(READY_DRAFT, 'UTC', false));
    await api.deleteAccount();
    const sent = { region: 'ap-southeast-1', headers: { 'x-lmu-app': V } };
    expect(calls).toEqual([
      { name: 'lmu-sync', options: { body: { timeZone: 'Asia/Manila', events: [] }, timeout: 20_000, ...sent } },
      { name: 'lmu-onboarding', options: { body: toRequest(READY_DRAFT, 'UTC', false), timeout: 30_000, ...sent } },
      { name: 'lmu-account-delete', options: { body: { confirm: 'DELETE' }, timeout: 20_000, ...sent } },
    ]);
  });

  it('a build without a version names none, so the server counts it as 0.1.0 (review)', async () => {
    const { client, calls } = clientReturning(async () => ({ data: {}, error: null }));
    await makeApi(client, null).deleteAccount();
    expect(calls).toEqual([{ name: 'lmu-account-delete', options: { body: { confirm: 'DELETE' }, timeout: 20_000, region: 'ap-southeast-1', headers: {} } }]);
  });
});
