import { describe, expect, it } from 'vitest';
import { PERSONAS, PERSONA_ESTIMATES, campaignPacing } from '../src/campaign.ts';
import { FIXTURE } from './fixtures/library.ts';

describe('the campaign simulation (real built days)', () => {
  const warrior = PERSONAS.find((p) => p.name === 'warrior')!;

  it('has one persona per class at the default 25 minutes', () => {
    expect(PERSONAS.map((p) => p.classId)).toEqual(['warrior', 'mage', 'rogue', 'monk']);
    expect(PERSONAS.every((p) => p.minutesPerDay === 25)).toBe(true);
  });

  it('is deterministic, and a player who clears everything reaches level 2 on day 1', () => {
    const a = campaignPacing(FIXTURE, warrior, 1, { runs: 2, days: 10 });
    expect(campaignPacing(FIXTURE, warrior, 1, { runs: 2, days: 10 })).toEqual(a);
    expect(a.levels[2]).toBe(1);
  });

  it('a player who clears nothing never levels and never ranks up', () => {
    const none = campaignPacing(FIXTURE, warrior, 0, { runs: 2, days: 10 });
    expect(none.levels[2]).toBe(null);
    expect(none.rankDay).toBe(null);
  });

  it("takes the starting estimates (M9b decision 7): the personas' by default, and a stronger main stat ranks up sooner", () => {
    const plain = campaignPacing(FIXTURE, warrior, 1, { runs: 2, days: 120 });
    expect(campaignPacing(FIXTURE, warrior, 1, { runs: 2, days: 120, estimates: () => PERSONA_ESTIMATES })).toEqual(plain);
    const strong = campaignPacing(FIXTURE, warrior, 1, { runs: 2, days: 120, estimates: () => ({ ...PERSONA_ESTIMATES, strength: 8 }) });
    expect(plain.rankDay).toBe(84); // measured 2026-10-13
    expect(strong.rankDay!).toBeLessThan(plain.rankDay!);
    expect(strong.levels).toEqual(plain.levels);
  });
});
