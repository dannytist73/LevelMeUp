// The deployed functions on the live project (npm run test:live). Every player created here is deleted at the end.
import { describe, expect, it } from 'vitest';
import { ANON_KEY, ONBOARDING, call, eventId, newPlayer, sync } from './helpers.ts';
import type { Player } from './helpers.ts';

const quest = (state: any, slot: string) => state.today.quests.find((q: any) => q.slot === slot);
const now = () => Date.now();

describe('who may call the functions', () => {
  it('no token is refused by the gateway', async () => {
    expect((await call('lmu-sync', null, { timeZone: 'UTC' })).status).toBe(401);
  });

  it('the anon key is not a player', async () => {
    expect(await call('lmu-sync', ANON_KEY, { timeZone: 'UTC' })).toMatchObject({ status: 403, body: { error: 'not_player' } });
  });

  it('a forged token is refused', async () => {
    const [h, , s] = ANON_KEY.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: crypto.randomUUID(), role: 'authenticated', exp: now() / 1000 + 600 })).toString('base64url');
    expect((await call('lmu-sync', `${h}.${forged}.${s}`, { timeZone: 'UTC' })).status).toBe(401);
  });
});

describe('a player from onboarding to a cleared quest', () => {
  let a: Player;
  let state: any;

  it('has no character before onboarding', async () => {
    a = await newPlayer();
    expect(await sync(a)).toMatchObject({ status: 404, body: { error: 'not_started' } });
  });

  it('refuses bad onboarding answers', async () => {
    expect(await call('lmu-onboarding', a.token, { ...ONBOARDING, goals: ['body', 'focus', 'learn'] }))
      .toMatchObject({ status: 400, body: { error: 'bad_field', detail: 'goals' } });
  });

  it('onboarding makes the character and a light day 1 (template reveal: no Claude key yet)', async () => {
    const res = await call('lmu-onboarding', a.token, ONBOARDING);
    expect(res.status).toBe(201);
    expect(res.body.reveal.source).toBe('template');
    state = res.body.state;
    expect(state.profile).toMatchObject({ name: 'Live Test', classId: 'warrior', voice: 'system' });
    expect(state.character).toMatchObject({ totalXp: 0, level: 1 });
    expect(state.character.stats.strength.points).toBe(7);
    expect(state.today).toMatchObject({ dayNumber: 1, light: true, status: 'open', budget: 10 });
    expect(state.today.quests.length).toBeGreaterThanOrEqual(3);
  });

  it('onboarding happens once', async () => {
    expect(await call('lmu-onboarding', a.token, ONBOARDING)).toMatchObject({ status: 409, body: { error: 'already_started' } });
  });

  it('sync returns the same day', async () => {
    const res = await sync(a);
    expect(res.status).toBe(200);
    expect(res.body.state.today.id).toBe(state.today.id);
  });

  it('a completion pays the stored XP once; a repeat changes nothing; a second event is refused', async () => {
    const core = quest(state, 'core');
    expect(core.completion).toBe('reps');
    const first = eventId();
    const done = await sync(a, [{ id: first, type: 'complete', instanceId: core.id, completedAt: now(), payload: { sets: [6, 5] } }]);
    expect(done.status).toBe(200);
    const total = Object.values(core.xp as Record<string, number>).reduce((s, x) => s + x, 0);
    expect(done.body.results).toEqual([{ id: first, ok: true, result: expect.objectContaining({ totalXp: total }) }]);
    expect(done.body.state.character.totalXp).toBe(total);
    expect(done.body.newAchievements).toContain('first-trial');

    const repeat = await sync(a, [{ id: first, type: 'complete', instanceId: core.id, completedAt: now(), payload: { sets: [6, 5] } }]);
    expect(repeat.body.results[0]).toEqual(done.body.results[0]);
    expect(repeat.body.state.character.totalXp).toBe(total);

    const second = await sync(a, [{ id: eventId(), type: 'complete', instanceId: core.id, completedAt: now(), payload: { sets: [6] } }]);
    expect(second.body.results[0]).toMatchObject({ ok: false, code: 'already_completed' });
  });

  it('undo takes the XP back; rating needs a completion; completing again pays again', async () => {
    const core = quest(state, 'core');
    const undone = await sync(a, [{ id: eventId(), type: 'undo', instanceId: core.id }, { id: eventId(), type: 'rate', instanceId: core.id, rating: 'easy' }]);
    expect(undone.body.results.map((r: any) => r.ok)).toEqual([true, false]);
    expect(undone.body.results[1].code).toBe('not_completed');
    expect(undone.body.state.character.totalXp).toBe(0);
    const again = await sync(a, [
      { id: eventId(), type: 'complete', instanceId: core.id, completedAt: now(), payload: { sets: [6] } },
      { id: eventId(), type: 'rate', instanceId: core.id, rating: 'easy' },
    ]);
    expect(again.body.results.map((r: any) => r.ok)).toEqual([true, true]);
    expect(quest(again.body.state, 'core')).toMatchObject({ rating: 'easy' });
  });

  it('a batch applies the good events and reports each bad one', async () => {
    const side1 = quest(state, 'side1');
    const side2 = quest(state, 'side2');
    const res = await sync(a, [
      { id: eventId(), type: 'swap', instanceId: side1.id },
      { id: eventId(), type: 'complete', instanceId: side1.id, completedAt: now(), payload: side1.completion === 'text' ? { text: 'Done.' } : { sets: [3] } },
      { id: eventId(), type: 'complete', instanceId: side2.id, completedAt: now(), payload: { sets: [], text: '' } },
      { id: eventId(), type: 'complete', instanceId: side2.id, completedAt: now() + 3_600_000, payload: {} },
    ]);
    expect(res.status).toBe(200);
    expect(res.body.rejected).toEqual([expect.objectContaining({ code: 'unsupported_event' })]);
    expect(res.body.results.map((r: any) => r.ok)).toEqual([true, false, false]);
    expect(res.body.results[1].code).toBe(side2.completion === 'tap' ? 'future' : 'bad_payload');
  });

  it('another player cannot touch these quests', async () => {
    const b = await newPlayer();
    expect((await call('lmu-onboarding', b.token, { ...ONBOARDING, classId: 'monk', goals: ['energy'] })).status).toBe(201);
    const res = await sync(b, [{ id: eventId(), type: 'undo', instanceId: quest(state, 'core').id }]);
    expect(res.body.results[0]).toMatchObject({ ok: false, code: 'not_found' });
    const mine = await sync(a);
    expect(quest(mine.body.state, 'core').completedAt).not.toBeNull();
  });
});

describe('concurrency', () => {
  it('10 onboarding calls at once make one character', async () => {
    const c = await newPlayer();
    const replies = await Promise.all(Array.from({ length: 10 }, () => call('lmu-onboarding', c.token, ONBOARDING)));
    expect(replies.filter((r) => r.status === 201)).toHaveLength(1);
    expect(replies.filter((r) => r.status !== 201).every((r) => r.status === 409)).toBe(true);
  });

  it('10 completions of one quest at once pay once', async () => {
    const d = await newPlayer();
    const start = await call('lmu-onboarding', d.token, ONBOARDING);
    const core = quest(start.body.state, 'core');
    const replies = await Promise.all(
      Array.from({ length: 10 }, () => sync(d, [{ id: eventId(), type: 'complete', instanceId: core.id, completedAt: now(), payload: { sets: [5] } }])),
    );
    const results = replies.map((r) => r.body.results[0]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok).every((r) => r.code === 'already_completed')).toBe(true);
    const final = await sync(d);
    expect(final.body.state.character.totalXp).toBe(Object.values(core.xp as Record<string, number>).reduce((s, x) => s + x, 0));
  });
});

describe('account deletion', () => {
  it('asks for confirmation, then removes the game data and the anonymous sign-in', async () => {
    const e = await newPlayer();
    await call('lmu-onboarding', e.token, ONBOARDING);
    expect(await call('lmu-account-delete', e.token, {})).toMatchObject({ status: 400, body: { error: 'confirm' } });
    const res = await call('lmu-account-delete', e.token, { confirm: 'DELETE' });
    expect(res).toMatchObject({ status: 200, body: { signIn: 'deleted', deleted: expect.objectContaining({ profile: 1, days: 1 }) } });
    expect(await sync(e)).toMatchObject({ status: 404, body: { error: 'not_started' } });
  });
});
