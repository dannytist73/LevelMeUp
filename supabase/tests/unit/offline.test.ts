import { describe, expect, it } from 'vitest';
import { CLOCK_SKEW_MS, plannedMoves } from '../../../packages/rules/src/index.ts';
import { provisionalClock, sameQuests } from '../../functions/_shared/offline.ts';
import { DAY1, instanceRows } from './fixtures.ts';

const NOW = Date.UTC(2026, 9, 12, 2);
const LAST_END = Date.UTC(2026, 9, 11, 20);

describe('the clock an offline day is applied at (M6e decision 5)', () => {
  it('is when the phone built it, never later than now', () => {
    expect(provisionalClock(LAST_END + 1000, NOW, LAST_END)).toBe(LAST_END + 1000);
    expect(provisionalClock(NOW + 1000, NOW, LAST_END)).toBe(NOW);
  });

  it("a phone up to 5 minutes behind the last day's end counts as that end", () => {
    expect(provisionalClock(LAST_END - CLOCK_SKEW_MS, NOW, LAST_END)).toBe(LAST_END);
    expect(provisionalClock(LAST_END - CLOCK_SKEW_MS - 1, NOW, LAST_END)).toBe(LAST_END - CLOCK_SKEW_MS - 1);
  });

  it('a day built more than 5 minutes ahead of now: the phone clock is ahead', () => {
    expect(provisionalClock(NOW + CLOCK_SKEW_MS + 1, NOW, LAST_END)).toBeNull();
  });
});

describe('a stored day is the one the phone showed', () => {
  const rows = instanceRows(DAY1, 1);
  const phone = DAY1.quests.map((q) => ({ slot: q.slot, templateId: q.templateId, why: q.why, moves: plannedMoves(q.condition) }));

  it('when every slot has the same template (and a workout the same exercises)', () => {
    expect(sameQuests(rows, phone)).toBe(true);
    expect(sameQuests(rows, phone.slice(1))).toBe(false);
    expect(sameQuests(rows, phone.map((q, i) => (i === 0 ? { ...q, templateId: 'other-0' } : q)))).toBe(false);
  });
});
