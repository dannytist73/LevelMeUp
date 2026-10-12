import { describe, expect, it } from 'vitest';
import { cumulativeXpForLevel, newLadder } from '../../../packages/rules/src/index.ts';
import type { CheckinAnswer } from '../../../packages/rules/src/index.ts';
import { LIBRARY } from '../../../packages/content/src/index.ts';
import { planAdjust } from '../../functions/_shared/adjust.ts';
import type { Snapshot } from '../../functions/_shared/state.ts';
import { DAY_TWO_SLOTS, HOUR, characterRow, dayTwoSnapshot, ladderRows, manilaDay, pendingCheckin, profileRow } from './fixtures.ts';

const ctx = { nowMs: manilaDay(2).startsAt + HOUR, library: LIBRARY };
const answer = (a: CheckinAnswer, secondWind = false) =>
  ({ id: '00000000-0000-4000-8000-0000000000a1', type: 'checkin' as const, checkinId: 7, answer: a, secondWind });
const waiting = (over: Partial<Snapshot> = {}): Snapshot => dayTwoSnapshot(DAY_TWO_SLOTS, {
  checkin: pendingCheckin(),
  character: characterRow({ awaiting_checkin: true, streak_current: 4, streak_best: 6, shields: 1 }),
  ladders: ladderRows({ push: newLadder(1) }),
  ...over,
});

describe('answering the check-in (M7a decisions 2–8)', () => {
  it('refuses a check-in that is not the pending one, or is answered', () => {
    expect(planAdjust(waiting(), { ...answer('sick'), checkinId: 8 }, ctx)).toEqual({ code: 'not_found' });
    expect(planAdjust(waiting({ checkin: null }), answer('sick'), ctx)).toEqual({ code: 'not_found' });
    expect(planAdjust(waiting({ checkin: pendingCheckin({ answer: 'just_didnt' }) }), answer('sick'), ctx)).toEqual({ code: 'already_answered' });
    const resolved = { id: '7', answer: 'emergency' as const, answered_at: new Date(ctx.nowMs - HOUR), gap_from: null, gap_to: null };
    expect(planAdjust(waiting({ checkin: null, answered: [resolved] }), answer('sick'), ctx)).toEqual({ code: 'already_answered' });
  });

  it('refuses when no day runs (lmu-sync closes ended days first)', () => {
    expect(planAdjust(waiting(), answer('sick'), { ...ctx, nowMs: manilaDay(2).endsAt })).toEqual({ code: 'day_closed' });
  });

  it('sick: resolved at once, the streak goes on, the next day is light', () => {
    expect(planAdjust(waiting(), answer('sick'), ctx)).toEqual({
      change: {
        day: { id: 2 },
        checkin: { id: 7, answer: 'sick', recoveryDayId: null, outcome: 'protected' },
        streak: { current: 4, best: 6, shields: 1, awaitingCheckin: false },
        lightNext: true,
      },
    });
  });

  it('injured also rests the missed core exercise; too hard steps its ladder down; away days touch no ladder', () => {
    expect(planAdjust(waiting(), answer('injured'), ctx)).toMatchObject({ change: { ladders: { push: { paused: true } } } });
    expect(planAdjust(waiting(), answer('too_hard'), ctx)).toMatchObject({ change: { ladders: { push: { rung: 0 } } } });
    const gap = pendingCheckin({ day_id: null, gap_from: 1, gap_to: 1, missed_day: null, missed_core: null, missed_ladder: null });
    const plan = planAdjust(waiting({ checkin: gap }), answer('too_hard'), ctx);
    expect('change' in plan && plan.change.ladders).toBeUndefined();
  });

  it('a lighter load drops the minutes one step and answers the lighter-plan offer; never below 10', () => {
    expect(planAdjust(waiting(), answer('lighter_load'), ctx)).toMatchObject({ change: { minutes: 15, lighterPlanAt: true } });
    const lowest = planAdjust(waiting({ profile: profileRow(undefined, { minutes_per_day: 10 }) }), answer('lighter_load'), ctx);
    expect(lowest).toMatchObject({ change: { lighterPlanAt: true } });
    expect('change' in lowest && lowest.change.minutes).toBeUndefined();
  });

  it("\"I just didn't\": the class's recovery quest joins today and the streak stays held", () => {
    const plan = planAdjust(waiting(), answer('just_didnt'), ctx);
    expect(plan).toMatchObject({
      change: {
        day: { id: 2 },
        checkin: { id: 7, answer: 'just_didnt', recoveryDayId: 2, outcome: null },
        recovery: { slot: 'recovery', templateId: 'recovery-walk', xp: { discipline: 5 } },
      },
    });
    expect('change' in plan && plan.change.streak).toBeUndefined();
    const s = waiting();
    const core = s.instances.find((q) => String(q.day_id) === '2' && q.slot === 'core')!;
    const held = { ...s, instances: [...s.instances, { ...core, id: '299', slot: 'recovery' as const }] };
    expect(planAdjust(held, answer('just_didnt'), ctx)).toEqual({ code: 'already_applied' });
  });

  it('Second Wind redoes the missed core quest and starts its wait; refused when not ready', () => {
    const slots = { core: 'walk-1', side1: 'mobility-0', side2: 'reading-0' };
    const warrior = dayTwoSnapshot(slots, {
      checkin: pendingCheckin(), character: characterRow({ awaiting_checkin: true, xp_strength: cumulativeXpForLevel(5) }),
    });
    expect(planAdjust(warrior, answer('just_didnt', true), ctx)).toMatchObject({
      change: { recovery: { templateId: 'push-0', why: { code: 'second_wind' } }, ability: { id: 'second_wind', day: 2 } },
    });
    expect(planAdjust(waiting(), answer('just_didnt', true), ctx)).toEqual({ code: 'ability_not_ready' });
  });
});

describe('the lighter plan (decision 9)', () => {
  const lighter = (accept: boolean) => ({ id: '00000000-0000-4000-8000-0000000000a2', type: 'lighter_plan' as const, accept });

  it('"Keep my plan" answers the offer; accepting drops the minutes one step; at 10 there is none', () => {
    expect(planAdjust(dayTwoSnapshot(), lighter(false), ctx)).toEqual({ change: { lighterPlanAt: true } });
    expect(planAdjust(dayTwoSnapshot(), lighter(true), ctx)).toEqual({ change: { minutes: 15, lighterPlanAt: true } });
    const ten = dayTwoSnapshot(DAY_TWO_SLOTS, { profile: profileRow(undefined, { minutes_per_day: 10 }) });
    expect(planAdjust(ten, lighter(true), ctx)).toEqual({ code: 'no_lighter_plan' });
  });
});
