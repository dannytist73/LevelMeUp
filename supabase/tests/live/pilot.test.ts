// M9b, live: an app older than the minimum is asked to update (decision 5), and the functions run next to the database
// when asked (decision 2). One temporary player, deleted when the file ends (helpers.ts).
import { describe, expect, it } from 'vitest';
import { ANON_KEY, ONBOARDING, REGION, URL_BASE, call, newPlayer } from './helpers.ts';
import type { Player } from './helpers.ts';

const median = (xs: readonly number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;

type Timed = { ms: number; region: string | null; status: number };

/** One empty sync, timed from the laptop; `region` null lets Supabase pick the nearest. */
async function timedSync(p: Player, region: string | null): Promise<Timed> {
  const headers: Record<string, string> = { apikey: ANON_KEY, authorization: `Bearer ${p.token}`, 'content-type': 'application/json' };
  if (region !== null) headers['x-region'] = region;
  const started = performance.now();
  const res = await fetch(`${URL_BASE}/functions/v1/lmu-sync`, { method: 'POST', headers, body: JSON.stringify({ timeZone: 'Asia/Manila', events: [] }) });
  await res.text();
  return { ms: performance.now() - started, region: res.headers.get('x-sb-edge-region'), status: res.status };
}

describe('the pilot build (M9b)', () => {
  let player: Player;

  it('an app older than the minimum is asked to update; no version, or a current one, is served', async () => {
    player = await newPlayer();
    const old = { 'x-lmu-app': '0.0.9' };
    expect(await call('lmu-sync', player.token, { timeZone: 'Asia/Manila', events: [] }, old)).toEqual({ status: 426, body: { error: 'update_required' } });
    expect(await call('lmu-onboarding', player.token, ONBOARDING, old)).toEqual({ status: 426, body: { error: 'update_required' } });
    expect((await call('lmu-sync', player.token, { timeZone: 'Asia/Manila', events: [] })).status).toBe(404); // served: not_started
    expect((await call('lmu-onboarding', player.token, ONBOARDING, { 'x-lmu-app': '0.2.0' })).status).toBe(200);
  });

  it('runs next to the database when asked: a sync answers from ap-southeast-1 in well under 3 s', async () => {
    await timedSync(player, REGION); // a cold start in either region doesn't count
    await timedSync(player, null);
    const pinned: Timed[] = [];
    const nearest: Timed[] = [];
    for (let i = 0; i < 5; i++) {
      pinned.push(await timedSync(player, REGION));
      nearest.push(await timedSync(player, null));
    }
    console.info(
      `lmu-sync, median of 5: ${median(pinned.map((r) => r.ms)).toFixed(0)} ms in ${pinned[0]!.region}; ` +
        `${median(nearest.map((r) => r.ms)).toFixed(0)} ms in ${nearest[0]!.region} (nearest the laptop)`,
    );
    expect(pinned.every((r) => r.status === 200 && r.region === REGION)).toBe(true);
    expect(median(pinned.map((r) => r.ms))).toBeLessThan(3_000);
  }, 180_000); // six syncs from Seoul at 11–15 s each outlast the live tests' 60 s
});
