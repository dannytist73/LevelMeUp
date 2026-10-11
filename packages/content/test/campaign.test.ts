import { describe, expect, it } from 'vitest';
import { PACING_PROFILES, PERSONAS, campaignFailures, campaignPacing } from '../../rules/src/index.ts';
import { LIBRARY } from '../src/library.ts';
import { trainedStart } from './trained.ts';

describe('pacing on real built days (spec §2.1, §2.3)', () => {
  it('every persona meets the level targets, and the classes reach rank C in about 3 months on average', () => {
    expect(campaignFailures(LIBRARY, { runs: 400 })).toEqual([]);
  }, 300_000);
});

describe('pacing for experienced players (M5 plan, decision 4)', () => {
  it('starting one rung up reaches level 5 at most about a day sooner, and every later level on target', () => {
    for (const persona of PERSONAS) {
      const steady = campaignPacing(LIBRARY, persona, PACING_PROFILES.steady, { runs: 200, startLadders: trainedStart });
      const struggling = campaignPacing(LIBRARY, persona, PACING_PROFILES.struggling, { runs: 200, startLadders: trainedStart });
      expect(steady.levels[5], `${persona.name} steady L5`).toBeGreaterThanOrEqual(5.0);
      expect(steady.levels[10], `${persona.name} steady L10`).toBeGreaterThanOrEqual(15.5);
      expect(steady.levels[15], `${persona.name} steady L15`).toBeGreaterThanOrEqual(33.6);
      expect(struggling.levels[5], `${persona.name} struggling L5`).toBeGreaterThanOrEqual(10.0);
      expect(struggling.levels[10], `${persona.name} struggling L10`).toBeGreaterThanOrEqual(32);
    }
  }, 300_000);
});
