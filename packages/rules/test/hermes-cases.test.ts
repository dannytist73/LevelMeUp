import { describe, expect, it } from 'vitest';
import { TIME_CASES } from './hermes-cases.ts';

describe('the time cases the phone re-runs on Hermes are right in Node', () => {
  it('covers the time tests (at least 18 cases)', () => {
    expect(TIME_CASES.length).toBeGreaterThanOrEqual(18);
  });

  it.each(TIME_CASES.map((c) => [c.name, c] as const))('%s', (_, c) => {
    expect(c.actual()).toEqual(c.expected);
  });
});
