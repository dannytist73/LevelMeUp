import { describe, expect, it } from 'vitest';
import { newLadder } from '../../../packages/rules/src/index.ts';
import { playerFromAuthHeader } from '../../functions/_shared/auth.ts';
import { readJson } from '../../functions/_shared/http.ts';
import { achievementProgress, characterView, pastDays, stateView, toProfile } from '../../functions/_shared/state.ts';
import { DAY1, characterRow, dayRow, instanceRows, manilaDay, profileRow } from './fixtures.ts';

const NOW = Date.UTC(2026, 9, 10, 12);
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = (claims: object) => `Bearer ${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(claims)}.signature`;
const SUB = '6a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d';
const exp = NOW / 1000 + 3600;

describe('the player behind a request', () => {
  it('reads a signed-in player from the verified token', () => {
    expect(playerFromAuthHeader(token({ sub: SUB, role: 'authenticated', exp, is_anonymous: true }), NOW)).toEqual({ userId: SUB, anonymous: true });
    expect(playerFromAuthHeader(token({ sub: SUB.toUpperCase(), role: 'authenticated', exp }), NOW)).toEqual({ userId: SUB, anonymous: false });
  });

  it('refuses the anon key, a missing player id, an expired or malformed token', () => {
    expect(playerFromAuthHeader(token({ role: 'anon', exp }), NOW)).toMatchObject({ status: 403, code: 'not_player' });
    expect(playerFromAuthHeader(token({ sub: 'x', role: 'authenticated', exp }), NOW)).toMatchObject({ status: 403, code: 'not_player' });
    expect(playerFromAuthHeader(token({ sub: SUB, role: 'authenticated', exp: NOW / 1000 - 1 }), NOW)).toMatchObject({ status: 401, code: 'expired' });
    expect(playerFromAuthHeader(token({ sub: SUB, role: 'authenticated' }), NOW)).toMatchObject({ status: 401, code: 'expired' });
    expect(playerFromAuthHeader('Bearer abc', NOW)).toMatchObject({ status: 401, code: 'bad_token' });
    expect(playerFromAuthHeader('Bearer a.!!!.c', NOW)).toMatchObject({ status: 401, code: 'bad_token' });
    expect(playerFromAuthHeader(null, NOW)).toMatchObject({ status: 401, code: 'no_token' });
    expect(playerFromAuthHeader('Basic abc', NOW)).toMatchObject({ status: 401, code: 'no_token' });
  });
});

describe('reading request bodies', () => {
  const post = (body: string) => new Request('https://x/', { method: 'POST', body });

  it('parses JSON and treats an empty body as {}', async () => {
    expect(await readJson(post('{"a":1}'))).toEqual({ a: 1 });
    expect(await readJson(post(''))).toEqual({});
  });

  it('refuses other methods, bad JSON and large bodies', async () => {
    expect(await readJson(new Request('https://x/'))).toMatchObject({ status: 405 });
    expect(await readJson(post('{'))).toMatchObject({ status: 400, code: 'bad_json' });
    expect(await readJson(post(`"${'x'.repeat(70_000)}"`))).toMatchObject({ status: 413 });
  });
});

describe('what the rules make of the rows', () => {
  it('computes level and stat points from stored XP (nothing derived is stored)', () => {
    const view = characterView(characterRow({ xp_strength: 22, xp_discipline: 10 }));
    expect(view).toMatchObject({ totalXp: 32, level: 2, xpIntoLevel: 2, xpForLevel: 50 });
    expect(view.stats.strength).toEqual({ points: 8, rank: 'E', xp: 22, toNext: 66 });
    expect(view.stats.vitality.points).toBe(5);
  });

  it('builds the rules profile from the profile row and stat XP', () => {
    const profile = toProfile(profileRow(), { strength: 9, vitality: 5, wisdom: 5, focus: 5, discipline: 4 }, { strength: 88, vitality: 0, wisdom: 0, focus: 0, discipline: 0 });
    expect(profile).toMatchObject({ classId: 'warrior', level: 3, minutesPerDay: 25, stats: { strength: 11, vitality: 5, wisdom: 5, focus: 5 } });
  });

  it('turns days into the builder history, oldest first', () => {
    const history = pastDays([dayRow(DAY1, 1)], instanceRows(DAY1, 1));
    expect(history).toHaveLength(1);
    expect(history[0]!.dayNumber).toBe(1);
    expect(history[0]!.quests.core).toBe(DAY1.quests.find((q) => q.slot === 'core')!.templateId);
  });

  it('collects achievement progress', () => {
    const progress = achievementProgress(characterRow({ quests_cleared: 4, streak_best: 7, ability_last_used: { second_wind: 9 } }), {
      walk: { ...newLadder(2), highestRung: 3 },
    });
    expect(progress).toMatchObject({ questsCleared: 4, bestStreak: 7, highestRungs: { walk: 3 }, bestRank: 'E', abilitiesUsed: ['second_wind'] });
  });
});

describe('the state the phone receives', () => {
  it('shows today with its quests in slot order, earlier days, pending check-ins and achievements', () => {
    const day2 = { ...DAY1, dayNumber: 2, startsAt: new Date(manilaDay(2).startsAt).toISOString(), endsAt: new Date(manilaDay(2).endsAt).toISOString() };
    const view = stateView({
      profile: profileRow(),
      character: characterRow({ xp_vitality: 20 }),
      ladders: [],
      days: [dayRow(DAY1, 1, { status: 'closed', resolution: 'streak_day' }), dayRow(day2, 2)],
      instances: [...instanceRows(DAY1, 1, ['core']), ...instanceRows(day2, 2).reverse()],
      checkins: [{ id: '7', day_id: null, gap_from: 3, gap_to: 4, answer: null }],
      earned: ['level-5', 'first-trial'],
    });
    expect(view.today).toMatchObject({ id: 2, dayNumber: 2, status: 'open' });
    expect(view.today!.quests.map((q) => q.slot)).toEqual(DAY1.quests.map((q) => q.slot));
    expect(view.today!.quests[0]).toMatchObject({ id: 200, completedAt: null });
    expect(view.recentDays).toEqual([{ dayNumber: 1, startsAt: DAY1.startsAt, status: 'closed', resolution: 'streak_day', cleared: 1 }]);
    expect(view.checkinsDue).toEqual([{ id: 7, dayId: null, gapFrom: 3, gapTo: 4 }]);
    expect(view.achievements).toEqual(['first-trial', 'level-5']);
    expect(view.character.totalXp).toBe(20);
    expect(view.profile).toMatchObject({ classId: 'warrior', minutesPerDay: 25 });
  });
});
