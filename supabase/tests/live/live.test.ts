// The deployed functions on the live project (npm run test:live). Every player created here is deleted at the end.
import { describe, expect, it } from 'vitest';
import { LIBRARY } from '../../../packages/content/src/index.ts';
import { painKey, templateById } from '../../../packages/rules/src/index.ts';
import { ANON_KEY, ONBOARDING, call, eventId, newPlayer, signedIn, sync } from './helpers.ts';
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

  it('onboarding makes the character and a light day 1, with the reveal written by Claude', async () => {
    const res = await call('lmu-onboarding', a.token, ONBOARDING);
    expect(res.status).toBe(201);
    expect(res.body.reveal).toMatchObject({ source: 'claude', narrative: expect.any(String), strengths: expect.any(Array), growth: expect.any(Array) });
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

  it('refuses the M3 body (a class and estimates instead of answers)', async () => {
    const { training: _training, safety: _safety, ...answersLeftOut } = ONBOARDING;
    const old = { ...answersLeftOut, classId: 'warrior', estimates: { strength: 8, vitality: 8, wisdom: 8, focus: 8, discipline: 8 } };
    expect(await call('lmu-onboarding', a.token, old)).toMatchObject({ status: 400, body: { error: 'bad_field', detail: 'training' } });
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
      { id: eventId(), type: 'checkin', dayId: state.today.id },
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
    const first = await call('lmu-onboarding', b.token, { ...ONBOARDING, goals: ['energy'], safety: [true, false, false, false, false, false, false] });
    expect(first.status).toBe(201);
    expect(first.body.state.profile).toMatchObject({ classId: 'monk', gentleStart: true });
    // The reveal's "Change class" (M5): onboarding again, same answers, the player's class.
    const changed = await call('lmu-onboarding', b.token, { ...ONBOARDING, goals: ['energy'], safety: [true, false, false, false, false, false, false], classId: 'mage', redo: true });
    expect(changed.status).toBe(201);
    expect(changed.body.state.profile).toMatchObject({ classId: 'mage', gentleStart: true });
    expect(changed.body.state.today.dayNumber).toBe(1);
    const res = await sync(b, [{ id: eventId(), type: 'undo', instanceId: quest(state, 'core').id }]);
    expect(res.body.results[0]).toMatchObject({ ok: false, code: 'not_found' });
    const mine = await sync(a);
    expect(quest(mine.body.state, 'core').completedAt).not.toBeNull();
  });

  it('once a quest is done, onboarding can\'t run again', async () => {
    expect(await call('lmu-onboarding', a.token, { ...ONBOARDING, classId: 'mage', redo: true }))
      .toMatchObject({ status: 409, body: { error: 'locked' } });
    expect((await sync(a)).body.state.profile.classId).toBe('warrior');
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
    expect(await signedIn(e)).toBe(false);
    expect(await sync(e)).toMatchObject({ status: 401, body: { error: 'session_ended' } });
  });

  it('keeps a sign-in that never had a LevelMeUp character (it may be a wedding guest\'s)', async () => {
    const f = await newPlayer();
    const res = await call('lmu-account-delete', f.token, { confirm: 'DELETE' });
    expect(res).toMatchObject({ status: 200, body: { signIn: 'kept', deleted: expect.objectContaining({ profile: 0 }) } });
    expect(await signedIn(f)).toBe(true);
    // Make it LevelMeUp's, so the clean-up at the end can remove it.
    expect((await call('lmu-onboarding', f.token, ONBOARDING)).status).toBe(201);
  });
});

describe('adjusting the day (M6b)', () => {
  let g: Player;
  let state: any;
  let hurt: any;
  const openQuests = (s: any) => s.today.quests.filter((q: any) => q.completedAt === null && q.slot !== 'article');
  const isExercise = (q: any) => templateById(LIBRARY, q.templateId).exercise !== null;
  const total = (xp: Record<string, number>) => Object.values(xp).reduce((sum, x) => sum + x, 0);

  it('day 1 comes with what the player may change', async () => {
    g = await newPlayer();
    const res = await call('lmu-onboarding', g.token, ONBOARDING);
    expect(res.status).toBe(201);
    state = res.body.state;
    expect(state.today).toMatchObject({ swapsLeft: 1, restAllowed: true, hardDay: false, abilities: [] });
    expect(state).toMatchObject({ paused: [], painReports: 0, profile: { classChangedAt: null } });
    hurt = openQuests(state).find(isExercise);
    expect(hurt).toBeDefined();
  });

  it('a swap replaces a quest in place, once a day', async () => {
    const target = openQuests(state).find((q: any) => q.swaps.length > 0 && q.id !== hurt.id);
    const to = target.swaps[0].templateId;
    let res = await sync(g, [{ id: eventId(), type: 'swap', instanceId: target.id, templateId: to }]);
    expect(res.body.results[0]).toMatchObject({ ok: true });
    expect(quest(res.body.state, target.slot)).toMatchObject({ id: target.id, templateId: to });
    expect(res.body.state.today.swapsLeft).toBe(0);
    res = await sync(g, [{ id: eventId(), type: 'swap', instanceId: target.id, templateId: to }]);
    expect(res.body.results[0]).toMatchObject({ ok: false, code: 'no_swaps_left' });
    state = res.body.state;
  });

  it("a hard day lightens the open quests for less XP, once", async () => {
    const before = quest(state, hurt.slot);
    let res = await sync(g, [{ id: eventId(), type: 'hard_day', dayId: state.today.id }]);
    expect(res.body.results[0]).toMatchObject({ ok: true });
    const after = quest(res.body.state, hurt.slot);
    expect(res.body.state.today.hardDay).toBe(true);
    expect(after.hardDay).toBe(true);
    expect(total(after.xp)).toBeLessThan(total(before.xp));
    res = await sync(g, [{ id: eventId(), type: 'hard_day', dayId: state.today.id }]);
    expect(res.body.results[0]).toMatchObject({ ok: false, code: 'already_hard_day' });
    state = res.body.state;
  });

  it('"I felt pain": the exercise rests, today is protected, and the report counts', async () => {
    const res = await sync(g, [{ id: eventId(), type: 'pain', instanceId: hurt.id, choice: 'rest' }]);
    expect(res.body.results[0]).toMatchObject({ ok: true });
    expect(res.body.state.today.protection).toBe('pain');
    expect(res.body.state.paused).toEqual([painKey(templateById(LIBRARY, hurt.templateId))]);
    expect(res.body.state.painReports).toBe(1);
    const rest = await sync(g, [{ id: eventId(), type: 'plan_rest', dayId: state.today.id }]);
    expect(rest.body.results[0]).toMatchObject({ ok: false, code: 'already_protected' });
  });

  it('the exercise comes back when the player says so', async () => {
    const res = await sync(g, [{ id: eventId(), type: 'resume', ladderId: painKey(templateById(LIBRARY, hurt.templateId)) }]);
    expect(res.body.results[0]).toMatchObject({ ok: true });
    expect(res.body.state.paused).toEqual([]);
  });

  it('a class change keeps everything earned and then waits 14 days; a repeat changes nothing', async () => {
    const change = { id: eventId(), type: 'class_change', classId: 'monk' };
    const res = await sync(g, [change]);
    expect(res.body.results[0]).toMatchObject({ ok: true });
    expect(res.body.state.profile.classId).toBe('monk');
    expect(res.body.state.profile.classChangedAt).not.toBeNull();
    expect(res.body.state.character.totalXp).toBe(state.character.totalXp);
    const again = await sync(g, [change, { id: eventId(), type: 'class_change', classId: 'mage' }]);
    expect(again.body.results.map((r: any) => (r.ok ? 'ok' : r.code))).toEqual(['ok', 'class_locked']);
    expect(again.body.results[0].result).toEqual(res.body.results[0].result);
    const reused = await sync(g, [{ id: change.id, type: 'plan_rest', dayId: state.today.id }]);
    expect(reused.body.results[0]).toMatchObject({ ok: false, code: 'event_reused' });
  });
});

describe('the training setup (M6c)', () => {
  let t: Player;

  it('onboarding stores the equipment and the program style', async () => {
    t = await newPlayer();
    const res = await call('lmu-onboarding', t.token, { ...ONBOARDING, equipment: ['dumbbells', 'bench'], programStyle: 'women' });
    expect(res.status).toBe(201);
    expect(res.body.state.profile).toMatchObject({ equipment: ['dumbbells', 'bench'], programStyle: 'women' });
  });

  it('a training event changes them; a repeat changes nothing; a bad one is refused', async () => {
    const change = { id: eventId(), type: 'training', equipment: ['gym'], programStyle: 'men' };
    const res = await sync(t, [change, { id: eventId(), type: 'training', equipment: ['kettlebell'], programStyle: 'men' }]);
    expect(res.body.results[0]).toMatchObject({ ok: true });
    expect(res.body.rejected).toEqual([expect.objectContaining({ code: 'bad_event' })]);
    expect(res.body.state.profile).toMatchObject({ equipment: ['gym'], programStyle: 'men' });
    const again = await sync(t, [change]);
    expect(again.body.results[0].result).toEqual(res.body.results[0].result);
  });
});

describe('Character and Chronicle (M6d)', () => {
  let c: Player;

  it('onboarding returns day 1 on the calendar and growth from day 1', async () => {
    c = await newPlayer();
    const res = await call('lmu-onboarding', c.token, ONBOARDING);
    expect(res.status).toBe(201);
    const state = res.body.state;
    expect(state.calendar).toEqual([{ dayNumber: 1, date: expect.stringMatching(/^\d{4}-\d\d-\d\d$/), mark: 'open' }]);
    expect(state.growth).toMatchObject({ since: state.calendar[0].date, levels: 0, questsCleared: 0, newRungs: 0 });
    expect(state.character.abilityLastUsed).toEqual({});
    expect(state.reading).toBeNull();
  });

  it("the book needs Scholar's Path; a bad one is refused", async () => {
    const res = await sync(c, [
      { id: eventId(), type: 'book', title: 'Dune', finished: false },
      { id: eventId(), type: 'book', title: '', finished: false },
    ]);
    expect(res.body.results[0]).toMatchObject({ ok: false, code: 'ability_not_ready' });
    expect(res.body.rejected).toEqual([expect.objectContaining({ code: 'bad_event' })]);
    expect(res.body.state.profile.book).toBeNull();
  });
});

describe('offline-built days (M6e)', () => {
  let d: Player;
  let state: any;

  it('the state carries what the phone needs to build the next day', async () => {
    d = await newPlayer();
    const res = await call('lmu-onboarding', d.token, ONBOARDING);
    expect(res.status).toBe(201);
    state = res.body.state;
    expect(typeof state.ladders).toBe('object');
    expect(state.history).toEqual([{ dayNumber: 1, quests: expect.objectContaining({ core: quest(state, 'core').templateId }) }]);
    expect(state.workoutsDone).toBe(0);
  });

  it('a quest named by its day and slot is the one completed and undone', async () => {
    const core = quest(state, 'core');
    const ref = { dayNumber: 1, slot: 'core', templateId: core.templateId };
    const done = await sync(d, [{ id: eventId(), type: 'complete', ref, completedAt: now(), payload: { sets: [6, 5] } }]);
    expect(done.body.results[0]).toMatchObject({ ok: true });
    expect(quest(done.body.state, 'core').completedAt).not.toBeNull();
    const undone = await sync(d, [{ id: eventId(), type: 'undo', ref }]);
    expect(undone.body.results[0]).toMatchObject({ ok: true });
    expect(undone.body.state.character.totalXp).toBe(0);
  });

  it("another quest in that slot still counts the work; pain rests the exercise the player did; a rating isn't kept", async () => {
    // The phone showed walk-0 (a check-off) where the server has a rep quest (review fixes).
    const did = quest(state, 'core').templateId === 'walk-0' ? 'walk-1' : 'walk-0';
    const ref = { dayNumber: 1, slot: 'core', templateId: did };
    const res = await sync(d, [
      { id: eventId(), type: 'complete', ref, completedAt: now(), rating: 'easy', payload: {} },
      { id: eventId(), type: 'pain', ref, choice: 'pause' },
      { id: eventId(), type: 'rate', ref, rating: 'too_hard' },
      { id: eventId(), type: 'undo', ref: { ...ref, dayNumber: 9 } },
    ]);
    expect(res.body.results.map((r: any) => r.ok ? 'ok' : r.code)).toEqual(['ok', 'ok', 'quest_changed', 'not_found']);
    expect(quest(res.body.state, 'core')).toMatchObject({ completedAt: expect.any(String), rating: null });
    expect(res.body.state.paused).toEqual([painKey(templateById(LIBRARY, did))]);
  });

  it("a day built while the server's day still runs is refused (clock_ahead); a malformed one is rejected", async () => {
    const day = {
      type: 'provisional_day', dayNumber: 2, builtAt: now(), timeZone: 'Asia/Manila', window: { startsAt: now(), endsAt: now() + 86_400_000 },
      budget: 25, light: false, quests: [{ slot: 'core', templateId: quest(state, 'core').templateId, why: { code: 'light_day' }, moves: null, book: null }],
    };
    const res = await sync(d, [{ id: eventId(), ...day }, { id: eventId(), ...day, dayNumber: 1 }]);
    expect(res.body.results[0]).toMatchObject({ ok: false, code: 'clock_ahead' });
    expect(res.body.rejected).toEqual([expect.objectContaining({ code: 'bad_event' })]);
    expect(res.body.state.today.dayNumber).toBe(1);
  });
});
