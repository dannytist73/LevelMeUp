import { describe, expect, it } from 'vitest';
import { DAY_MS } from '../../../packages/rules/src/index.ts';
import { LIBRARY } from '../../../packages/content/src/index.ts';
import { planAdjust } from '../../functions/_shared/adjust.ts';
import { consequenceFor, pactLevel } from '../../functions/_shared/pact.ts';
import type { AnsweredRow, Snapshot } from '../../functions/_shared/state.ts';
import { DAY1, DAY_TWO_SLOTS, HOUR, characterRow, claimedSnapshot, dayTwoSnapshot, manilaDay, pendingCheckin, profileRow } from './fixtures.ts';

const nowMs = manilaDay(2).startsAt + HOUR;
const ctx = { nowMs, library: LIBRARY };
const ev = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
/** Day 2 with day 1's check-in pending; the pact at `level`, signed the day before day 1. */
const waiting = (level: number, over: Partial<Snapshot> = {}): Snapshot => dayTwoSnapshot(DAY_TWO_SLOTS, {
  checkin: pendingCheckin(),
  character: characterRow({ awaiting_checkin: true }),
  profile: profileRow(undefined, { accountability_level: level, accountability_enabled_at: new Date(Date.parse(DAY1.startsAt) - DAY_MS) }),
  ...over,
});
const applied = (n: number, consequence: AnsweredRow['consequence'] = 'shadow', dayId = '1'): AnsweredRow => ({
  id: String(100 + n), answer: 'just_didnt', answered_at: new Date(nowMs - (n + 1) * DAY_MS), gap_from: null, gap_to: null,
  consequence, recovery_day_id: dayId,
});

describe('what "I just didn\'t" sets off under the pact (M7c decision 4)', () => {
  it('nothing without a pact; the Shadow at level 1; the Trial at level 2', () => {
    expect(consequenceFor(waiting(0), pendingCheckin(), 2, nowMs)).toBeNull();
    expect(consequenceFor(waiting(1), pendingCheckin(), 2, nowMs)).toBe('shadow');
    expect(consequenceFor(waiting(2), pendingCheckin(), 2, nowMs)).toBe('trial');
  });

  it('never for a day that began before the pact was signed (never today\'s)', () => {
    const late = waiting(1, { profile: profileRow(undefined, { accountability_level: 1, accountability_enabled_at: new Date(Date.parse(DAY1.startsAt) + HOUR) }) });
    expect(consequenceFor(late, pendingCheckin(), 2, nowMs)).toBeNull();
  });

  it('away days count from when the first of them started (the end of the day before)', () => {
    const gap = pendingCheckin({ day_id: null, gap_from: 2, gap_to: 2, missed_starts_at: null, gap_starts_at: new Date(DAY1.endsAt) });
    expect(consequenceFor(waiting(1), gap, 3, nowMs)).toBe('shadow');
    expect(consequenceFor(waiting(1), { ...gap, gap_starts_at: null }, 3, nowMs)).toBeNull(); // unknown: never a consequence
  });

  it('paused after 3 in the last 7 days; one a day; a lifted or paused one does not count', () => {
    expect(consequenceFor(waiting(1, { answered: [applied(1), applied(2), applied(3)] }), pendingCheckin(), 2, nowMs)).toBe('paused');
    expect(consequenceFor(waiting(1, { answered: [applied(1), applied(2), applied(8)] }), pendingCheckin(), 2, nowMs)).toBe('shadow');
    expect(consequenceFor(waiting(1, { answered: [applied(1, null), applied(2, 'paused'), applied(3)] }), pendingCheckin(), 2, nowMs)).toBe('shadow');
    expect(consequenceFor(waiting(1, { answered: [applied(0, 'trial', '2')] }), pendingCheckin(), 2, nowMs)).toBeNull();
  });

  it('bad data never punishes: an unknown level is no pact', () => {
    expect(pactLevel(7)).toBe(0);
    expect(consequenceFor(waiting(7), pendingCheckin(), 2, nowMs)).toBeNull();
  });

  it('the answer carries it, and only "I just didn\'t" does', () => {
    const answer = (a: 'just_didnt' | 'emergency') => ({ id: ev(1), type: 'checkin' as const, checkinId: 7, answer: a, secondWind: false });
    expect(planAdjust(waiting(2), answer('just_didnt'), ctx)).toMatchObject({ change: { checkin: { answer: 'just_didnt', consequence: 'trial' } } });
    const protectedPlan = planAdjust(waiting(2), answer('emergency'), ctx);
    expect('change' in protectedPlan && protectedPlan.change.checkin).not.toHaveProperty('consequence');
    const none = planAdjust(waiting(0), answer('just_didnt'), ctx);
    expect('change' in none && none.change.checkin).not.toHaveProperty('consequence');
  });
});

describe('the pact itself (decision 3)', () => {
  const set = (level: 0 | 1 | 2) => ({ id: ev(2), type: 'accountability_set' as const, level });

  it('the same level is refused; a raise is signed', () => {
    expect(planAdjust(dayTwoSnapshot(), set(0), ctx)).toEqual({ code: 'same_level' });
    expect(planAdjust(dayTwoSnapshot(), set(2), ctx)).toEqual({ change: { pact: { level: 2 } } });
  });

  it("lowering eases today's consequence at once: level 1 breaks the seal, off lifts the Shadow", () => {
    expect(planAdjust(claimedSnapshot('trial'), set(1), ctx)).toEqual({ change: { pact: { level: 1 }, consequence: { checkinId: 7, kind: 'shadow' } } });
    expect(planAdjust(claimedSnapshot('trial'), set(0), ctx)).toEqual({ change: { pact: { level: 0 }, consequence: { checkinId: 7, kind: null } } });
    expect(planAdjust(claimedSnapshot('shadow'), set(0), ctx)).toEqual({ change: { pact: { level: 0 }, consequence: { checkinId: 7, kind: null } } });
    expect(planAdjust(claimedSnapshot('paused'), set(0), ctx)).toEqual({ change: { pact: { level: 0 } } });
  });

  it("a raise never touches today's", () => {
    expect(planAdjust(claimedSnapshot('shadow'), set(2), ctx)).toEqual({ change: { pact: { level: 2 } } });
  });
});

describe('the Trial and the note (decisions 7–8)', () => {
  const trial = { id: ev(3), type: 'trial' as const, checkinId: 7 };
  const note = (text: string | null, checkinId = 7) => ({ id: ev(4), type: 'checkin_note' as const, checkinId, note: text });

  it('the Trial breaks the seal once, on its day, while it runs', () => {
    expect(planAdjust(claimedSnapshot('trial'), trial, ctx)).toEqual({ change: { day: { id: 2 }, trial: { checkinId: 7 } } });
    expect(planAdjust(claimedSnapshot('shadow'), trial, ctx)).toEqual({ code: 'no_trial' });
    expect(planAdjust(claimedSnapshot('trial'), { ...trial, checkinId: 8 }, ctx)).toEqual({ code: 'no_trial' });
    expect(planAdjust(claimedSnapshot('trial', { trial_done_at: new Date(nowMs) }), trial, ctx)).toEqual({ code: 'trial_done' });
    expect(planAdjust(claimedSnapshot('trial'), trial, { ...ctx, nowMs: manilaDay(2).endsAt })).toEqual({ code: 'day_closed' });
  });

  it("a note for the check-in being held, or one answered in the last 14 days; null clears it", () => {
    expect(planAdjust(claimedSnapshot('shadow'), note('A late shift.'), ctx)).toEqual({ change: { note: { checkinId: 7, text: 'A late shift.' } } });
    expect(planAdjust(claimedSnapshot('shadow'), note(null), ctx)).toEqual({ change: { note: { checkinId: 7, text: null } } });
    const answered = dayTwoSnapshot(DAY_TWO_SLOTS, { answered: [applied(3)] });
    expect(planAdjust(answered, note('Rain.', 103), ctx)).toEqual({ change: { note: { checkinId: 103, text: 'Rain.' } } });
    expect(planAdjust(dayTwoSnapshot(), note('Rain.', 103), ctx)).toEqual({ code: 'checkin_gone' });
    expect(planAdjust(waiting(1), note('Not answered yet.'), ctx)).toEqual({ code: 'checkin_gone' });
  });
});
