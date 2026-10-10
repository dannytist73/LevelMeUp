import { describe, expect, it } from 'vitest';
import { targetText } from '../src/format.ts';

describe('quest targets in words', () => {
  it.each([
    [{ kind: 'reps', sets: 3, reps: 8, perSide: false }, '3 sets of 8'],
    [{ kind: 'reps', sets: 1, reps: 10, perSide: true }, '1 set of 10 per side'],
    [{ kind: 'hold', sets: 4, seconds: 30, perSide: false }, '4 holds of 30 seconds'],
    [{ kind: 'minutes', minutes: 20 }, '20 minutes'],
    [{ kind: 'minutes', minutes: 1 }, '1 minute'],
    [{ kind: 'sentence' }, 'One sentence'],
    [{ kind: 'habit' }, ''],
  ] as const)('%o reads "%s"', (condition, text) => {
    expect(targetText(condition)).toBe(text);
  });
});
