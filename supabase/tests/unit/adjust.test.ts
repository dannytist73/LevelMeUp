import { describe, expect, it } from 'vitest';
import { LIBRARY } from '../../../packages/content/src/index.ts';
import {
  levelForXp, newLadder, planWorkout, plannedMoves, questReward, recordPain, sessionCondition, templateById,
} from '../../../packages/rules/src/index.ts';
import type { PlayerProfile, Rating } from '../../../packages/rules/src/index.ts';
import { planAdjust, planOfflinePain } from '../../functions/_shared/adjust.ts';
import type { AdjustEvent } from '../../functions/_shared/events.ts';
import { isProblem } from '../../functions/_shared/http.ts';
import { parseOnboarding, startArgs, templateReveal } from '../../functions/_shared/onboarding.ts';
import { NO_OFFERS, startPoints, stateView, statXp, toProfile } from '../../functions/_shared/state.ts';
import type { CharacterRow, DayRow, ProfileRow, Snapshot } from '../../functions/_shared/state.ts';
import { dayOffers } from '../../functions/_shared/today.ts';
import {
  DAY_MS, DAY_TWO_SLOTS, HOUR, ONBOARDED, characterRow, dayRow, dayTwoSnapshot, historyOf, instanceRows, ladderRows, manilaDay,
  onboardingBody, profileRow,
} from './fixtures.ts';

export const NOW = manilaDay(2).startsAt + HOUR;
/** Day 2 with push at rung 1 (so the core quest, push-1, is at its ladder's rung). */
export const at = (over: Partial<Snapshot> = {}, day: Partial<DayRow> = {}): Snapshot =>
  dayTwoSnapshot(DAY_TWO_SLOTS, { ladders: ladderRows({ push: newLadder(1) }), ...over }, day);
/** Day 2 renumbered as day 3, after two planned rest days. */
export function rested(): Snapshot {
  const s = at();
  const [today, day1] = s.days as [DayRow, DayRow];
  return {
    ...s,
    days: [{ ...today, day_number: 3 }, { ...day1, protection: 'planned_rest' }, { ...day1, id: '9', day_number: 2, protection: 'planned_rest' }],
  };
}
const monk = (xp: number, used: Partial<Record<'stillness', number>> = {}): Partial<Snapshot> => ({
  profile: profileRow(undefined, { class_id: 'monk' }),
  character: characterRow({ xp_vitality: xp, ability_last_used: used }),
});

describe('what the phone may offer today (today.ts)', () => {
  it('swap options for each open core and side quest; a Warrior has 1 swap a day', () => {
    const offers = dayOffers(at(), LIBRARY);
    expect(offers.swapsLeft).toBe(1);
    expect(Object.keys(offers.swaps).sort()).toEqual(['200', '201', '202']);
    expect(offers.swaps['200']!.length).toBeGreaterThan(0);
    expect(offers.swaps['200']!.every((o) => o.why.code === 'swap' && o.templateId !== 'push-1')).toBe(true);
  });

  it('a Rogue from level 5 swaps twice (Shadowstep); a used swap counts; none left offers none', () => {
    const rogue = { profile: profileRow(undefined, { class_id: 'rogue' }), character: characterRow({ xp_focus: 240 }) };
    expect(dayOffers(at(rogue), LIBRARY).swapsLeft).toBe(2);
    expect(dayOffers(at(rogue, { swaps_used: 1 }), LIBRARY).swapsLeft).toBe(1);
    const spent = dayOffers(at({}, { swaps_used: 1 }), LIBRARY);
    expect(spent.swapsLeft).toBe(0);
    expect(Object.values(spent.swaps).every((options) => options.length === 0)).toBe(true);
  });

  it('gentle movement after pain, for exercise quests only', () => {
    const offers = dayOffers(at(), LIBRARY);
    expect(offers.gentle['200']).toMatchObject({ templateId: 'mobility-0', why: { code: 'pain' } }); // walking is in the day
    expect(offers.gentle['201']).toMatchObject({ templateId: 'mobility-0' }); // the walk hurt: another kind of movement
    expect('202' in offers.gentle).toBe(false); // reading
  });

  it('rest until 2 rest days in any 7, never on a day already protected', () => {
    expect(dayOffers(at(), LIBRARY).restAllowed).toBe(true);
    expect(dayOffers(at({}, { protection: 'pain' }), LIBRARY).restAllowed).toBe(false);
    expect(dayOffers(rested(), LIBRARY).restAllowed).toBe(false);
  });

  it('Stillness and Dawn Ritual for a Monk at levels 5 and 10, while the core quest is open', () => {
    expect(dayOffers(at(monk(0)), LIBRARY).abilities).toEqual([]);
    expect(dayOffers(at(monk(240)), LIBRARY).abilities.map((a) => a.ability)).toEqual(['stillness']);
    expect(dayOffers(at(monk(990)), LIBRARY).abilities.map((a) => [a.ability, a.quest.templateId])).toEqual([
      ['stillness', 'stillness'], ['dawn_ritual', 'dawn-ritual'],
    ]);
    // Stillness waits 7 quest days after its last use.
    expect(dayOffers(at(monk(990, { stillness: 1 })), LIBRARY).abilities.map((a) => a.ability)).toEqual(['dawn_ritual']);
  });

  it("step down only at the ladder's current rung, above the first, while it isn't resting", () => {
    expect(dayOffers(at(), LIBRARY).stepDown).toEqual(['200']);
    expect(dayOffers(at({ ladders: ladderRows({ push: newLadder(2) }) }), LIBRARY).stepDown).toEqual([]);
    expect(dayOffers(at({ ladders: ladderRows({ push: { ...newLadder(1), paused: true } }) }), LIBRARY).stepDown).toEqual([]);
  });

  it('nothing on a closed day; only rest on a day without quests', () => {
    expect(dayOffers(at({}, { status: 'closed', resolution: 'streak_day' }), LIBRARY)).toEqual(NO_OFFERS);
    const s = at();
    expect(dayOffers({ ...s, instances: s.instances.filter((q) => q.day_id !== '2') }, LIBRARY)).toEqual({ ...NO_OFFERS, restAllowed: true });
  });

  it("the live test's day 1 has an open exercise quest and a swap for another quest (supabase/tests/live)", () => {
    const choices = parseOnboarding(onboardingBody({ name: 'Live Test', goals: ['body'] }));
    if (isProblem(choices)) throw new Error('the live body is refused');
    const args = startArgs(choices, templateReveal(choices), ONBOARDED, LIBRARY);
    const start = Object.fromEntries(Object.entries(args.character).map(([stat, points]) => [`start_${stat}`, points]));
    const s: Snapshot = {
      profile: profileRow(choices), character: characterRow(start as Partial<CharacterRow>), ladders: ladderRows(args.ladders), days: [dayRow(args.day, 1)],
      instances: instanceRows(args.day, 1), checkins: [], earned: [], queued: false, painReports: 0, workoutsDone: 0,
    };
    const open = stateView(s, dayOffers(s, LIBRARY), historyOf(s)).today!.quests.filter((q) => q.slot !== 'article');
    const hurt = open.find((q) => templateById(LIBRARY, q.templateId).exercise !== null);
    expect(hurt).toBeDefined();
    expect(open.some((q) => q.swaps.length > 0 && q.id !== hurt!.id)).toBe(true);
  });
});

describe('the state view carries the offers (M6b)', () => {
  it('per quest, for today and for the player', () => {
    const s = at({ ladders: ladderRows({ push: newLadder(1), squat: { ...newLadder(), paused: true } }), painReports: 1 });
    const view = stateView(s, dayOffers(s, LIBRARY), historyOf(s));
    expect(view.today).toMatchObject({ swapsLeft: 1, restAllowed: true, abilities: [] });
    const core = view.today!.quests.find((q) => q.slot === 'core')!;
    expect(core.swaps.length).toBeGreaterThan(0);
    expect(core.gentle).toMatchObject({ templateId: 'mobility-0' });
    expect(core.canStepDown).toBe(true);
    expect(view.today!.quests.find((q) => q.slot === 'side2')!).toMatchObject({ gentle: null, canStepDown: false });
    expect(view.paused).toEqual(['squat']);
    expect(view.painReports).toBe(1);
    expect(view.profile.classChangedAt).toBeNull();
  });
});

const ID = '7d3e1f2a-1b2c-4d3e-8f40-0123456789ab';
type Draft = AdjustEvent extends infer E ? (E extends AdjustEvent ? Omit<E, 'id'> : never) : never;
const plan = (s: Snapshot, event: Draft, nowMs = NOW) => planAdjust(s, { id: ID, ...event } as AdjustEvent, { nowMs, library: LIBRARY });
/** Day 2 with the quest in `slot` cleared at NOW. */
const done = (s: Snapshot, slot: string, rating: Rating | null = null): Snapshot => ({
  ...s,
  instances: s.instances.map((q) => (q.day_id === '2' && q.slot === slot ? { ...q, completed_at: new Date(NOW), rating } : q)),
});

describe('planning an adjustment (adjust.ts)', () => {
  it('swap: an offered option, in place, counted', () => {
    const option = dayOffers(at(), LIBRARY).swaps['200']![0]!;
    expect(plan(at(), { type: 'swap', instanceId: 200, templateId: option.templateId })).toEqual({
      change: { day: { id: 2, swaps: 1 }, quests: [{ id: 200, slot: 'core', ...option }] },
    });
  });

  it('swap: refused when none is left, not offered, cleared, not a core or side quest, or not today', () => {
    expect(plan(at({}, { swaps_used: 1 }), { type: 'swap', instanceId: 200, templateId: 'squat-0' })).toEqual({ code: 'no_swaps_left' });
    expect(plan(at(), { type: 'swap', instanceId: 200, templateId: 'push-5' })).toEqual({ code: 'not_an_option' });
    expect(plan(done(at(), 'core'), { type: 'swap', instanceId: 200, templateId: 'squat-0' })).toEqual({ code: 'already_completed' });
    expect(plan(at(), { type: 'swap', instanceId: 203, templateId: 'squat-0' })).toEqual({ code: 'not_swappable' });
    expect(plan(at(), { type: 'swap', instanceId: 999, templateId: 'squat-0' })).toEqual({ code: 'not_found' });
    expect(plan(at(), { type: 'swap', instanceId: 100, templateId: 'squat-0' })).toEqual({ code: 'day_closed' }); // day 1's core
  });

  it('nothing changes on a day that has ended, even before the server closes it; pain still rests the exercise', () => {
    const ended = manilaDay(2).endsAt;
    const paused = { push: { ...newLadder(1), paused: true } };
    expect(plan(at(), { type: 'hard_day', dayId: 2 }, ended)).toEqual({ code: 'day_closed' });
    // A report that syncs late (M6b review): the day can't change any more, but the exercise rests.
    expect(plan(at(), { type: 'pain', instanceId: 200, choice: 'rest' }, ended)).toEqual({ change: { ladders: paused } });
    expect(plan(at(), { type: 'pain', instanceId: 100, choice: 'gentle' })).toEqual({ change: { ladders: paused } }); // day 1's core
  });

  it('hard day: every open core and side quest in its hard-day version, once', () => {
    const p = plan(done(at(), 'side2'), { type: 'hard_day', dayId: 2 });
    if (!('change' in p)) throw new Error(p.code);
    expect(p.change.day).toEqual({ id: 2, hardDay: true });
    expect(p.change.quests!.map((q) => [q.id, q.hardDay])).toEqual([[200, true], [201, true]]);
    const push = templateById(LIBRARY, 'push-1');
    expect(p.change.quests![0]).toMatchObject({ minutes: push.hardDay.minutes, condition: push.hardDay.condition, xp: questReward(push, true) });
    expect(plan(at({}, { hard_day: true }), { type: 'hard_day', dayId: 2 })).toEqual({ code: 'already_hard_day' });
    expect(plan(at(), { type: 'hard_day', dayId: 1 })).toEqual({ code: 'day_closed' });
    expect(plan(at(), { type: 'hard_day', dayId: 77 })).toEqual({ code: 'not_found' });
  });

  it('rest: protects today, at most 2 in any 7', () => {
    expect(plan(at(), { type: 'plan_rest', dayId: 2 })).toEqual({ change: { day: { id: 2, protection: 'planned_rest' } } });
    expect(plan(at({}, { protection: 'pain' }), { type: 'plan_rest', dayId: 2 })).toEqual({ code: 'already_protected' });
    expect(plan(rested(), { type: 'plan_rest', dayId: 2 })).toEqual({ code: 'rest_limit' });
  });

  it('pain: the ladder rests; gentle movement takes the slot, or today is protected', () => {
    const paused = { ...newLadder(1), paused: true };
    const gentle = dayOffers(at(), LIBRARY).gentle['200']!;
    expect(plan(at(), { type: 'pain', instanceId: 200, choice: 'gentle' })).toEqual({
      change: { ladders: { push: paused }, day: { id: 2 }, quests: [{ id: 200, slot: 'core', ...gentle }] },
    });
    expect(plan(at(), { type: 'pain', instanceId: 200, choice: 'rest' })).toEqual({
      change: { ladders: { push: paused }, day: { id: 2, protection: 'pain' } },
    });
    // Already a rest day: the reason stays; the ladder still rests.
    expect(plan(at({}, { protection: 'planned_rest' }), { type: 'pain', instanceId: 200, choice: 'rest' })).toEqual({ change: { ladders: { push: paused } } });
    expect(plan(done(at(), 'core'), { type: 'pain', instanceId: 200, choice: 'pause' })).toEqual({ change: { ladders: { push: paused } } });
    // Cleared before the report reached the server: the exercise still rests.
    expect(plan(done(at(), 'core'), { type: 'pain', instanceId: 200, choice: 'gentle' })).toEqual({ change: { ladders: { push: paused } } });
    expect(plan(at(), { type: 'pain', instanceId: 202, choice: 'rest' })).toEqual({ code: 'not_exercise' });
  });

  it('pain: a standalone exercise quest rests by its own id; with no gentle option, the day rests instead', () => {
    const micro = dayTwoSnapshot({ ...DAY_TWO_SLOTS, core: 'micro-squats' });
    expect(plan(micro, { type: 'pain', instanceId: 200, choice: 'pause' })).toEqual({
      change: { ladders: { 'micro-squats': { ...newLadder(), paused: true } } },
    });
    const others = templateById(LIBRARY, 'walk-1').minutes + templateById(LIBRARY, 'reading-0').minutes;
    const tight = at({}, { budget: others + 2 }); // 2 minutes left: no walk or mobility rung is that short
    expect(plan(tight, { type: 'pain', instanceId: 200, choice: 'gentle' })).toEqual({
      change: { ladders: { push: { ...newLadder(1), paused: true } }, day: { id: 2, protection: 'pain' } },
    });
    // Another quest of the day has a template this version doesn't know: the report still rests (re-review).
    const s = at();
    const retired = { ...s, instances: s.instances.map((q) => (q.id === '202' ? { ...q, template_id: 'retired-quest' } : q)) };
    expect(plan(retired, { type: 'pain', instanceId: 200, choice: 'gentle' })).toEqual({
      change: { ladders: { push: { ...newLadder(1), paused: true } }, day: { id: 2, protection: 'pain' } },
    });
  });

  it('resume: one rung lower, only while resting', () => {
    expect(plan(at({ ladders: ladderRows({ push: { ...newLadder(2), paused: true } }) }), { type: 'resume', ladderId: 'push' })).toEqual({
      change: { ladders: { push: { ...newLadder(2), rung: 1 } } },
    });
    expect(plan(at(), { type: 'resume', ladderId: 'push' })).toEqual({ code: 'not_paused' });
    expect(plan(at(), { type: 'resume', ladderId: 'squat' })).toEqual({ code: 'not_paused' });
  });

  it('step down: after "too hard", at the ladder\'s current rung', () => {
    expect(plan(done(at(), 'core', 'too_hard'), { type: 'step_down', instanceId: 200 })).toEqual({
      change: { ladders: { push: { ...newLadder(1), rung: 0 } } },
    });
    expect(plan(done(at(), 'core', 'right'), { type: 'step_down', instanceId: 200 })).toEqual({ code: 'not_too_hard' });
    expect(plan(at(), { type: 'step_down', instanceId: 200 })).toEqual({ code: 'not_too_hard' });
    const moved = done(at({ ladders: ladderRows({ push: newLadder(2) }) }), 'core', 'too_hard');
    expect(plan(moved, { type: 'step_down', instanceId: 200 })).toEqual({ code: 'not_current' });
  });

  it('class change: open at once after onboarding, then once every 14 days', () => {
    expect(plan(at(), { type: 'class_change', classId: 'monk' })).toEqual({ change: { classId: 'monk' } });
    expect(plan(at(), { type: 'class_change', classId: 'warrior' })).toEqual({ code: 'same_class' });
    const changed = (daysAgo: number) => at({ profile: profileRow(undefined, { class_changed_at: new Date(NOW - daysAgo * DAY_MS) }) });
    expect(plan(changed(13), { type: 'class_change', classId: 'monk' })).toEqual({ code: 'class_locked' });
    expect(plan(changed(14), { type: 'class_change', classId: 'monk' })).toEqual({ change: { classId: 'monk' } });
  });

  it('Stillness replaces the open core quest and records the quest day; an ability not ready is refused', () => {
    const p = plan(at(monk(240)), { type: 'ability', dayId: 2, ability: 'stillness' });
    if (!('change' in p)) throw new Error(p.code);
    expect(p.change.quests).toEqual([expect.objectContaining({ id: 200, slot: 'core', templateId: 'stillness', why: { code: 'stillness' } })]);
    expect(p.change.ability).toEqual({ id: 'stillness', day: 2 });
    expect(plan(at(monk(240)), { type: 'ability', dayId: 2, ability: 'dawn_ritual' })).toEqual({ code: 'ability_not_ready' });
    expect(plan(at(), { type: 'ability', dayId: 2, ability: 'stillness' })).toEqual({ code: 'ability_not_ready' });
    expect(plan(done(at(monk(240)), 'core'), { type: 'ability', dayId: 2, ability: 'stillness' })).toEqual({ code: 'already_completed' });
  });
});

describe('changing the training setup (M6c decision 12)', () => {
  const withWorkout = (over: Partial<Snapshot> = {}) => dayTwoSnapshot({ ...DAY_TWO_SLOTS, core: 'workout-0' }, over);

  it('stores the setup and re-plans today\'s open workout with it', () => {
    const s = withWorkout();
    const result = plan(s, { type: 'training', equipment: ['gym'], programStyle: 'men' });
    if (!('change' in result)) throw new Error(JSON.stringify(result));
    expect(result.change.training).toEqual({ equipment: ['gym'], programStyle: 'men' });
    const [core] = result.change.quests!;
    const template = templateById(LIBRARY, 'workout-0');
    const player: PlayerProfile = { ...toProfile(s.profile, startPoints(s.character), statXp(s.character)), equipment: ['gym'], programStyle: 'men' };
    expect(core).toMatchObject({ id: 200, templateId: 'workout-0', minutes: 16 });
    expect(core!.condition).toEqual(sessionCondition(template, planWorkout(LIBRARY.training, template, player, 0)!, false));
  });

  it('leaves a cleared workout, and every other quest, as it is', () => {
    const s = withWorkout();
    const cleared = { ...s, instances: s.instances.map((q) => (String(q.id) === '200' ? { ...q, completed_at: new Date(NOW - HOUR) } : q)) };
    expect(plan(cleared, { type: 'training', equipment: ['bands'], programStyle: 'none' })).toEqual({
      change: { training: { equipment: ['bands'], programStyle: 'none' } },
    });
    expect(plan(at(), { type: 'training', equipment: ['bands'], programStyle: 'none' })).toEqual({
      change: { training: { equipment: ['bands'], programStyle: 'none' } },
    });
  });

  it('after the day has ended, only the setup changes', () => {
    const late = planAdjust(withWorkout(), { id: 'e', type: 'training', equipment: [], programStyle: 'women' }, { nowMs: manilaDay(3).startsAt, library: LIBRARY });
    expect(late).toEqual({ change: { training: { equipment: [], programStyle: 'women' } } });
  });

  it('a hard-day workout is re-planned in its hard-day version (review)', () => {
    const s = withWorkout();
    const template = templateById(LIBRARY, 'workout-0');
    const hard = {
      ...s,
      instances: s.instances.map((q) => (String(q.id) === '200'
        ? { ...q, hard_day: true, minutes: 7, condition: sessionCondition(template, plannedMoves(q.condition)!, true) }
        : q)),
    };
    const result = plan(hard, { type: 'training', equipment: ['gym'], programStyle: 'men' });
    if (!('change' in result)) throw new Error(JSON.stringify(result));
    const player: PlayerProfile = { ...toProfile(s.profile, startPoints(s.character), statXp(s.character)), equipment: ['gym'], programStyle: 'men' };
    expect(result.change.quests![0]).toMatchObject({ id: 200, hardDay: true, minutes: 7 });
    expect(result.change.quests![0]!.condition).toEqual(sessionCondition(template, planWorkout(LIBRARY.training, template, player, 0)!, true));
  });

  it("a setup that leaves too few exercises keeps today's plan and still stores the setup (review)", () => {
    const limited = withWorkout({ profile: profileRow(undefined, { limitations: ['knee', 'back', 'shoulder', 'wrist'] }) });
    expect(plan(limited, { type: 'training', equipment: [], programStyle: 'none' })).toEqual({
      change: { training: { equipment: [], programStyle: 'none' } },
    });
  });
});

describe("Scholar's Path: the book (M6d decision 12)", () => {
  const L10 = (() => { let t = 0; while (levelForXp(t) < 10) t += 10; return t; })();
  const mage = (over: Partial<ProfileRow> = {}) => dayTwoSnapshot({ core: 'reading-1', side1: 'walk-1', side2: 'mobility-0' }, {
    profile: profileRow(undefined, { class_id: 'mage', ...over }),
    character: characterRow({ xp_wisdom: L10, total_xp: L10 }),
  });
  const book = (title: string | null, finished = false): Draft => ({ type: 'book', title, finished });

  it("needs Scholar's Path: a Mage at level 10", () => {
    const young = dayTwoSnapshot(undefined, { profile: profileRow(undefined, { class_id: 'mage' }) });
    expect(plan(young, book('Dune'))).toEqual({ code: 'ability_not_ready' });
    const warrior = dayTwoSnapshot(undefined, { character: characterRow({ xp_strength: L10, total_xp: L10 }) });
    expect(plan(warrior, book('Dune'))).toEqual({ code: 'ability_not_ready' });
  });

  it("sets the book and puts it on today's open reading quests", () => {
    const planned = plan(mage(), book('Dune'));
    expect(planned).toMatchObject({ change: { book: { title: 'Dune', finished: false }, day: { id: 2 } } });
    const quests = 'change' in planned ? planned.change.quests ?? [] : [];
    expect(quests.map((q) => [q.slot, q.templateId, q.book])).toEqual([['core', 'reading-1', 'Dune']]);
  });

  it('a cleared reading quest keeps its book; without an open reading quest only the profile changes', () => {
    expect(plan(done(mage(), 'core'), book('Dune'))).toEqual({ change: { book: { title: 'Dune', finished: false } } });
  });

  it('finishing needs a book; the same title again is refused; set aside needs a book', () => {
    expect(plan(mage(), book(null, true))).toEqual({ code: 'no_book' });
    expect(plan(mage(), book(null))).toEqual({ code: 'no_book' });
    expect(plan(mage({ book: 'Dune' }), book('Dune'))).toEqual({ code: 'same_book' });
    expect(plan(mage({ book: 'Dune' }), book(null, true))).toMatchObject({ change: { book: { title: null, finished: true } } });
    expect(plan(mage({ book: 'Dune' }), book('Dune', true))).toMatchObject({ change: { book: { title: 'Dune', finished: true } } });
  });

  it('after the day ends only the profile changes', () => {
    expect(plan(mage(), book('Dune'), NOW + 2 * DAY_MS)).toEqual({ change: { book: { title: 'Dune', finished: false } } });
  });
});

describe('"I felt pain" about a quest the server rebuilt (M6e review)', () => {
  const ctx = { nowMs: NOW, library: LIBRARY };
  const rested = { push: recordPain(newLadder(1)).state };
  const pain = (templateId: string, choice: 'rest' | 'pause' | 'gentle') => ({ dayNumber: 2, templateId, choice });
  const dayTwoId = (s: Snapshot) => Number(s.days.find((d) => d.day_number === 2)!.id);

  it('rests the exercise the player did; "pause" leaves the day as it is', () => {
    expect(planOfflinePain(at(), pain('push-1', 'pause'), ctx)).toEqual({ change: { ladders: rested } });
  });

  it('"rest" also protects the day while it runs, as on any day', () => {
    const s = at();
    expect(planOfflinePain(s, pain('push-1', 'rest'), ctx)).toEqual({ change: { ladders: rested, day: { id: dayTwoId(s), protection: 'pain' } } });
    expect(planOfflinePain(s, pain('push-1', 'gentle'), ctx)).toEqual({ change: { ladders: rested, day: { id: dayTwoId(s), protection: 'pain' } } });
  });

  it('after the day ended, or on a day already protected, only the exercise rests', () => {
    expect(planOfflinePain(at(), pain('push-1', 'rest'), { ...ctx, nowMs: NOW + 2 * DAY_MS })).toEqual({ change: { ladders: rested } });
    expect(planOfflinePain(at({}, { protection: 'planned_rest' }), pain('push-1', 'rest'), ctx)).toEqual({ change: { ladders: rested } });
  });

  it('refuses a quest that is no exercise, or one this content lacks', () => {
    expect(planOfflinePain(at(), pain('reading-0', 'rest'), ctx)).toEqual({ code: 'not_exercise' });
    expect(planOfflinePain(at(), pain('nope-0', 'rest'), ctx)).toEqual({ code: 'not_exercise' });
  });
});
