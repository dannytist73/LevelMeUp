import { describe, expect, it } from 'vitest';
import { PACING_PROFILES, PERSONAS, RANK_TARGET, campaignFailures, campaignPacing } from '../../rules/src/index.ts';
import { LIBRARY } from '../src/library.ts';
import { trainedEstimates, trainedStart } from './trained.ts';

// M6c (plan decision 15, step 3): a rank C miss alone is recorded for the M9 pilot data, not tuned. Since a workout keeps
// the movements it trains out of its day (review), the Warrior's steady pace reaches rank C on day 151, a day past the
// target; the exact line is accepted, so any further drift still fails.
const ACCEPTED = ['warrior steady rank C: day 151.0 (target 42–150)'];

describe('pacing on real built days (spec §2.1, §2.3)', () => {
  it('every persona meets the level targets, and the classes reach rank C in about 3 months on average', () => {
    expect(campaignFailures(LIBRARY, { runs: 400 }).filter((f) => !ACCEPTED.includes(f))).toEqual([]);
  }, 300_000);
});

describe('pacing for experienced players (M5 plan, decision 4)', () => {
  it('starting one rung up reaches level 5 at most about a day sooner, and every later level on target', () => {
    for (const persona of PERSONAS) {
      const steady = campaignPacing(LIBRARY, persona, PACING_PROFILES.steady, { runs: 200, startLadders: trainedStart, estimates: trainedEstimates });
      const struggling = campaignPacing(LIBRARY, persona, PACING_PROFILES.struggling, { runs: 200, startLadders: trainedStart, estimates: trainedEstimates });
      expect(steady.levels[5], `${persona.name} steady L5`).toBeGreaterThanOrEqual(5.0);
      expect(steady.levels[10], `${persona.name} steady L10`).toBeGreaterThanOrEqual(15.5);
      expect(steady.levels[15], `${persona.name} steady L15`).toBeGreaterThanOrEqual(33.6);
      expect(struggling.levels[5], `${persona.name} struggling L5`).toBeGreaterThanOrEqual(10.0);
      expect(struggling.levels[10], `${persona.name} struggling L10`).toBeGreaterThanOrEqual(32);
    }
  }, 300_000);
});

describe("experienced players' starting stats (M9b decision 7)", () => {
  it('reach rank C sooner than the same persona without experience, and never before 6 weeks', () => {
    for (const persona of PERSONAS) {
      // 400 runs, as measured (decision 7): the Mage's 42.8 is under a day above the floor, and the seeds are fixed.
      const plain = campaignPacing(LIBRARY, persona, PACING_PROFILES.steady, { runs: 400 });
      const trained = campaignPacing(LIBRARY, persona, PACING_PROFILES.steady, { runs: 400, startLadders: trainedStart, estimates: trainedEstimates });
      expect(trained.rankDay, persona.name).not.toBeNull();
      expect(trained.rankDay!, persona.name).toBeGreaterThanOrEqual(RANK_TARGET.eachMinDay);
      expect(trained.rankDay!, persona.name).toBeLessThan(plain.rankDay!);
    }
  }, 300_000);
});
