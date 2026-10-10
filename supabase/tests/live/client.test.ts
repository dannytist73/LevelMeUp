// The app's own function client (apps/mobile/src/net/api.ts) against the deployed functions, signed in the way the
// app signs in: supabase-js, the publishable key, an anonymous user. Proves the phone's exact request path end to end.
import { createClient } from '@supabase/supabase-js';
import { afterAll, describe, expect, it } from 'vitest';
import { makeApi } from '../../../apps/mobile/src/net/api.ts';
import { ONBOARDING, PUBLISHABLE_KEY, URL_BASE, eventId } from './helpers.ts';

const client = createClient(URL_BASE, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const api = makeApi(client);
let deleted = false;

afterAll(async () => {
  if (deleted || (await client.auth.getSession()).data.session === null) return;
  // A failed step must not leave the player behind: a sign-in without a character is kept by lmu-account-delete
  // (it may be a wedding guest's), so give it one first.
  let res = await api.deleteAccount();
  if (res.ok && res.body.signIn === 'kept') {
    await api.onboarding(ONBOARDING);
    res = await api.deleteAccount();
  }
  if (!res.ok || res.body.signIn !== 'deleted') throw new Error(`the client test player was left behind: ${JSON.stringify(res)}`);
});

describe('the app\'s client, live', () => {
  it('signs in anonymously with the publishable key, has no character yet, starts one, syncs a completion, deletes it', async () => {
    const { data, error } = await client.auth.signInAnonymously();
    expect(error).toBeNull();
    expect(data.user?.is_anonymous).toBe(true);

    expect(await api.sync({ timeZone: 'Asia/Manila', events: [] })).toEqual({ ok: false, status: 404, code: 'not_started' });

    const started = await api.onboarding(ONBOARDING);
    if (!started.ok) throw new Error(`onboarding failed: ${JSON.stringify(started)}`);
    const core = started.body.state.today!.quests.find((q) => q.slot === 'core')!;
    expect(core.completion).toBe('reps');

    const id = eventId();
    const synced = await api.sync({
      timeZone: 'Asia/Manila',
      events: [{ id, type: 'complete', instanceId: core.id, completedAt: Date.now(), rating: null, payload: { sets: [5] } }],
    });
    if (!synced.ok) throw new Error(`sync failed: ${JSON.stringify(synced)}`);
    expect(synced.body.results).toEqual([{ id, ok: true, result: expect.anything() }]);
    expect(synced.body.state.character.totalXp).toBe(Object.values(core.xp).reduce((s, x) => s + (x ?? 0), 0));

    const gone = await api.deleteAccount();
    expect(gone).toMatchObject({ ok: true, body: { signIn: 'deleted' } });
    deleted = true;
    expect(await api.sync({ timeZone: 'Asia/Manila', events: [] })).toEqual({ ok: false, status: 401, code: 'session_ended' });
  });
});
