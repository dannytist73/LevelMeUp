// lmu-articles-tick (M8a decision 8): the gateway lets the publishable key through, the function refuses anyone
// without the tick secret, a player included. No Claude call is made.
import { describe, expect, it } from 'vitest';
import { ANON_KEY, PUBLISHABLE_KEY, URL_BASE } from './helpers.ts';

const tick = (headers: Record<string, string>) =>
  fetch(`${URL_BASE}/functions/v1/lmu-articles-tick`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: '{}' });

describe('lmu-articles-tick', () => {
  it('reaches the function with the publishable key, which refuses a caller without the secret', async () => {
    const res = await tick({ apikey: PUBLISHABLE_KEY });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
  });

  it('refuses a wrong secret with a valid JWT', async () => {
    const res = await tick({ apikey: ANON_KEY, authorization: `Bearer ${ANON_KEY}`, 'x-lmu-tick': 'x'.repeat(64) });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
  });
});
