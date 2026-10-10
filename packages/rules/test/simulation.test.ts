import { describe, expect, it } from 'vitest';
import { LEVEL_CURVE } from '../src/levels.ts';
import { PACING_PROFILES, PACING_TARGETS, meetsTargets, mulberry32, simulatePacing } from '../src/simulation.ts';

describe('pacing simulation (spec §2.3)', () => {
  const results = {
    steady: simulatePacing(PACING_PROFILES.steady),
    struggling: simulatePacing(PACING_PROFILES.struggling),
  };

  it.each(PACING_TARGETS)('$profile players reach level $level between day $minDay and $maxDay', (target) => {
    const day = results[target.profile][target.level] ?? null;
    expect(day, 'never reached').not.toBeNull();
    expect(day).toBeGreaterThanOrEqual(target.minDay);
    expect(day).toBeLessThanOrEqual(target.maxDay);
  });

  it('the configured curve meets every target', () => {
    expect(meetsTargets(LEVEL_CURVE)).toBe(true);
  });

  it('the spec\'s original step of 20 is too fast', () => {
    expect(meetsTargets({ base: 30, step: 20 })).toBe(false);
  });

  it('is deterministic', () => {
    expect(simulatePacing(0.7)).toEqual(simulatePacing(0.7));
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
