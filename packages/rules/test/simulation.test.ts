import { describe, expect, it } from 'vitest';
import { PACING_PROFILES, PACING_TARGETS, meetsTargets, mulberry32, simulatePacing } from '../src/simulation.ts';

// M1 tuned the level step with this simplified model (a standard core quest every day, no misses). M2's campaign on
// real built days (campaign.ts, checked in packages/content) replaced it as the source of truth and set the step to
// 20. These tests keep the model honest as a record of how M1 reached 32.
describe('the simplified pacing model (M1)', () => {
  const M1_CURVE = { base: 30, step: 32 };
  const results = {
    steady: simulatePacing(PACING_PROFILES.steady, { curve: M1_CURVE }),
    struggling: simulatePacing(PACING_PROFILES.struggling, { curve: M1_CURVE }),
  };

  it.each(PACING_TARGETS)('with step 32, $profile players reach level $level between day $minDay and $maxDay', (target) => {
    const day = results[target.profile][target.level] ?? null;
    expect(day, 'never reached').not.toBeNull();
    expect(day).toBeGreaterThanOrEqual(target.minDay);
    expect(day).toBeLessThanOrEqual(target.maxDay);
  });

  it('levels faster than real days: step 20 is too fast for it', () => {
    expect(meetsTargets(M1_CURVE)).toBe(true);
    expect(meetsTargets({ base: 30, step: 20 })).toBe(false);
  });

  it('is deterministic', () => {
    expect(simulatePacing(0.7)).toEqual(simulatePacing(0.7));
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
