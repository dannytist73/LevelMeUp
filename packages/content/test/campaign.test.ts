import { describe, expect, it } from 'vitest';
import { campaignFailures } from '../../rules/src/index.ts';
import { LIBRARY } from '../src/library.ts';

describe('pacing on real built days (spec §2.1, §2.3)', () => {
  it('every persona meets the level targets, and the classes reach rank C in about 3 months on average', () => {
    expect(campaignFailures(LIBRARY, { runs: 400 })).toEqual([]);
  }, 300_000);
});
