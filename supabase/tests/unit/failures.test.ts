import { describe, expect, it } from 'vitest';
import { retryable } from '../../functions/_shared/failures.ts';

const pg = (code: string) => Object.assign(new Error('postgres'), { code });

describe('which failures of one event are worth the phone trying again (audit 2026-10-15)', () => {
  it('a lost connection, a rollback, a busy or stopped database: yes, the same event can succeed later', () => {
    for (const code of ['08006', '08P01', '40001', '40P01', '53300', '57014', '57P01', '58030', 'XX000']) expect(retryable(pg(code))).toBe(true);
  });

  it("the driver's and the network's own codes: yes", () => {
    for (const code of ['CONNECTION_CLOSED', 'CONNECTION_ENDED', 'CONNECT_TIMEOUT', 'ECONNRESET', 'EPIPE']) expect(retryable(pg(code))).toBe(true);
    expect(retryable(Object.assign(new Error('reset'), { name: 'ConnectionReset' }))).toBe(true);
    expect(retryable(Object.assign(new Error('slow'), { name: 'TimedOut' }))).toBe(true);
  });

  it('anything that would fail the same way every time: no, so it can never hold back the events behind it', () => {
    for (const code of ['23505', '23503', '42703', '42883', 'P0001']) expect(retryable(pg(code))).toBe(false);
    expect(retryable(new TypeError("Cannot read properties of undefined (reading 'slot')"))).toBe(false);
    expect(retryable(new RangeError('Invalid time value'))).toBe(false);
    expect(retryable('a string')).toBe(false);
    expect(retryable(null)).toBe(false);
  });
});
