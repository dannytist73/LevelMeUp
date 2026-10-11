import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { invoke, makeApi } from '../src/net/api.ts';
import { toRequest } from '../src/onboarding/flow.ts';
import { READY_DRAFT } from './support/fixtures.ts';

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
    expect(await invoke(client, 'lmu-sync', {})).toEqual({ ok: true, body: { state: 1 } });
  });

  it('an error response gives its status and the server\'s code', async () => {
    const { client } = clientReturning(async () => ({ data: null, error: httpError(404, '{"error":"not_started"}') }));
    expect(await invoke(client, 'lmu-sync', {})).toEqual({ ok: false, status: 404, code: 'not_started' });
  });

  it('the gateway\'s own 401 (no error field) becomes http_401', async () => {
    const { client } = clientReturning(async () => ({ data: null, error: httpError(401, '{"code":401,"message":"Invalid JWT"}') }));
    expect(await invoke(client, 'lmu-sync', {})).toEqual({ ok: false, status: 401, code: 'http_401' });
  });

  it('a body that is not JSON still gives the status', async () => {
    const { client } = clientReturning(async () => ({ data: null, error: httpError(502, 'Bad gateway') }));
    expect(await invoke(client, 'lmu-sync', {})).toEqual({ ok: false, status: 502, code: 'http_502' });
  });

  it.each([
    ['no connection', () => new FunctionsFetchError(new TypeError('Network request failed'))],
    ['a relay failure', () => new FunctionsRelayError({})],
  ])('%s counts as offline', async (_, makeError) => {
    const { client } = clientReturning(async () => ({ data: null, error: makeError() }));
    expect(await invoke(client, 'lmu-sync', {})).toEqual({ ok: false, status: 0, code: 'network' });
  });

  it('a thrown error counts as offline', async () => {
    const { client } = clientReturning(async () => {
      throw new Error('aborted');
    });
    expect(await invoke(client, 'lmu-sync', {})).toEqual({ ok: false, status: 0, code: 'network' });
  });

  it('each function has its own timeout, and the api sends the right bodies', async () => {
    const { client, calls } = clientReturning(async () => ({ data: {}, error: null }));
    const api = makeApi(client);
    await api.sync({ timeZone: 'Asia/Manila', events: [] });
    await api.onboarding(toRequest(READY_DRAFT, 'UTC', false));
    await api.deleteAccount();
    expect(calls).toEqual([
      { name: 'lmu-sync', options: { body: { timeZone: 'Asia/Manila', events: [] }, timeout: 20_000 } },
      { name: 'lmu-onboarding', options: { body: toRequest(READY_DRAFT, 'UTC', false), timeout: 30_000 } },
      { name: 'lmu-account-delete', options: { body: { confirm: 'DELETE' }, timeout: 20_000 } },
    ]);
  });
});
