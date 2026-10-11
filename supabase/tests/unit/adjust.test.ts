import { describe, expect, it } from 'vitest';
import { LIBRARY } from '../../../packages/content/src/index.ts';
import { newLadder, questReward, templateById } from '../../../packages/rules/src/index.ts';
import type { Rating } from '../../../packages/rules/src/index.ts';
import { planAdjust } from '../../functions/_shared/adjust.ts';
import type { AdjustEvent } from '../../functions/_shared/events.ts';
import { isProblem } from '../../functions/_shared/http.ts';
import { parseOnboarding, startArgs, templateReveal } from '../../functions/_shared/onboarding.ts';
import { NO_OFFERS, stateView } from '../../functions/_shared/state.ts';
import type { CharacterRow, DayRow, Snapshot } from '../../functions/_shared/state.ts';
import { dayOffers } from '../../functions/_shared/today.ts';
import {
  DAY_MS, DAY_TWO_SLOTS, HOUR, ONBOARDED, characterRow, dayRow, dayTwoSnapshot, instanceRows, ladderRows, manilaDay,
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
      instances: instanceRows(args.day, 1), checkins: [], earned: [], queued: false, painReports: 0,
    };
    const open = stateView(s, dayOffers(s, LIBRARY)).today!.quests.filter((q) => q.slot !== 'article');
    const hurt = open.find((q) => templateById(LIBRARY, q.templateId).exercise !== null);
    expect(hurt).toBeDefined();
    expect(open.some((q) => q.swaps.length > 0 && q.id !== hurt!.id)).toBe(true);
  });
});

describe('the state view carries the offers (M6b)', () => {
  it('per quest, for today and for the player', () => {
    const s = at({ ladders: ladderRows({ push: newLadder(1), squat: { ...newLadder(), paused: true } }), painReports: 1 });
    const view = stateView(s, dayOffers(s, LIBRARY));
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
