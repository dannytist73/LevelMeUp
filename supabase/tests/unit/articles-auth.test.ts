import { describe, expect, it } from 'vitest';
import { TICK_SECRET_MIN, tickAllowed } from '../../functions/_shared/articles/auth.ts';

const SECRET = 'a'.repeat(64);

describe('tickAllowed (M8a decision 8)', () => {
  it('lets the secret in', () => {
    expect(tickAllowed(SECRET, SECRET)).toBe(true);
  });

  it('refuses anything else', () => {
    expect(tickAllowed(null, SECRET)).toBe(false);
    expect(tickAllowed('', SECRET)).toBe(false);
    expect(tickAllowed('a'.repeat(63), SECRET)).toBe(false);
    expect(tickAllowed(`${SECRET}a`, SECRET)).toBe(false);
    expect(tickAllowed(`${'a'.repeat(63)}b`, SECRET)).toBe(false);
  });

  it('is off while the secret is missing or short', () => {
    expect(tickAllowed('', '')).toBe(false);
    expect(tickAllowed('short', 'short')).toBe(false);
    expect(TICK_SECRET_MIN).toBe(32);
  });
});
