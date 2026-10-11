// Live tests call the deployed functions on the shared project with temporary anonymous players, and delete every
// player they create (through lmu-account-delete) when the file ends. At most 8 players per run (sign-up limits).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll } from 'vitest';
import type { OnboardingBody } from '../../functions/_shared/onboarding.ts';

const env = Object.fromEntries(
  readFileSync(join(import.meta.dirname, '..', '..', '..', '.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
);
export const URL_BASE = env.LMU_SUPABASE_URL!;
export const ANON_KEY = env.LMU_SUPABASE_ANON_KEY!;
/** The key the app ships with (M4): public by design, unlike the service role. */
export const PUBLISHABLE_KEY = env.LMU_SUPABASE_PUBLISHABLE_KEY!;
const MAX_PLAYERS = 8;

export type Player = { id: string; token: string };
const created: Player[] = [];

export async function newPlayer(): Promise<Player> {
  if (created.length >= MAX_PLAYERS) throw new Error(`a live run creates at most ${MAX_PLAYERS} players`);
  const res = await fetch(`${URL_BASE}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  const body = (await res.json()) as { access_token?: string; user?: { id: string; is_anonymous?: boolean } };
  if (!res.ok || !body.access_token || !body.user) throw new Error(`anonymous sign-up failed: ${res.status} ${JSON.stringify(body)}`);
  const player = { id: body.user.id, token: body.access_token };
  created.push(player);
  return player;
}

export type Reply = { status: number; body: any };

export async function call(fn: string, token: string | null, body: unknown = {}): Promise<Reply> {
  const headers: Record<string, string> = { apikey: ANON_KEY, 'content-type': 'application/json' };
  if (token !== null) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${URL_BASE}/functions/v1/${fn}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // keep the text
  }
  return { status: res.status, body: parsed };
}

export const ONBOARDING: OnboardingBody = {
  name: 'Live Test', voice: 'system', goals: ['body'], training: 'some', reading: null, focus: null, limitations: [],
  safety: [false, false, false, false, false, false, false], minutesPerDay: 25, difficulty: 'steady', boundaryMinutes: 240,
  timeZone: 'Asia/Manila',
};

export const sync = (p: Player, events: unknown[] = []) => call('lmu-sync', p.token, { timeZone: 'Asia/Manila', events });

export function eventId(): string {
  return crypto.randomUUID();
}

/** Whether Supabase Auth still accepts the player's token (false once the sign-in is deleted). */
export async function signedIn(player: Player): Promise<boolean> {
  const res = await fetch(`${URL_BASE}/auth/v1/user`, { headers: { apikey: ANON_KEY, authorization: `Bearer ${player.token}` } });
  return res.ok;
}

afterAll(async () => {
  const failures: string[] = [];
  for (const player of created.splice(0)) {
    const res = await call('lmu-account-delete', player.token, { confirm: 'DELETE' });
    const deleted = res.status === 200 && res.body.signIn === 'deleted';
    const alreadyGone = res.status === 401 && res.body.error === 'session_ended';
    if (!deleted && !alreadyGone) failures.push(`${player.id}: ${res.status} ${JSON.stringify(res.body)}`);
    if (await signedIn(player)) failures.push(`${player.id}: the sign-in still exists`);
  }
  if (failures.length > 0) throw new Error(`test players left behind:\n${failures.join('\n')}`);
});
