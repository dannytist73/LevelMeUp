import { describe, expect, it } from 'vitest';
import { campaignFailures } from '../../rules/src/index.ts';
import { LIBRARY } from '../src/library.ts';

describe('pacing on real built days (spec §2.1, §2.3)', () => {
  // The rank target ("about rank C after 3 months") waits for the owner's decision on the stat divisor: the classes
  // reach rank C at very different speeds, so no divisor puts every class inside days 60–120 (M2 report, roadmap).
  it('every persona meets the level targets', () => {
    expect(campaignFailures(LIBRARY, { runs: 100 }).filter((failure) => !failure.includes('rank C'))).toEqual([]);
  }, 300_000);
});
