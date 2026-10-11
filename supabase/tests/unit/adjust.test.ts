import { describe, expect, it } from 'vitest';
import { LIBRARY } from '../../../packages/content/src/index.ts';
import { newLadder, templateById } from '../../../packages/rules/src/index.ts';
import { isProblem } from '../../functions/_shared/http.ts';
import { parseOnboarding, startArgs, templateReveal } from '../../functions/_shared/onboarding.ts';
import { NO_OFFERS, stateView } from '../../functions/_shared/state.ts';
import type { CharacterRow, DayRow, Snapshot } from '../../functions/_shared/state.ts';
import { dayOffers } from '../../functions/_shared/today.ts';
import {
  DAY_TWO_SLOTS, HOUR, ONBOARDED, characterRow, dayRow, dayTwoSnapshot, instanceRows, ladderRows, manilaDay, onboardingBody,
  profileRow,
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
