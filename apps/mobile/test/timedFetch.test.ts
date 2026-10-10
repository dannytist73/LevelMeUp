/** @jest-environment node */
import { timedFetch } from '../src/net/timedFetch.ts';

/** A fetch that never answers on its own; it rejects when its signal aborts, like the real one. */
const hanging = jest.fn((_input: unknown, init?: RequestInit) =>
  new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))),
) as unknown as typeof fetch;

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('requests with a time limit (M4 code review: no request may hang a sync)', () => {
  it('aborts a request that takes longer than the limit', async () => {
    const pending = timedFetch(1_000, hanging)('https://x', {});
    const settled = expect(pending).rejects.toThrow('aborted');
    jest.advanceTimersByTime(1_000);
    await settled;
  });

  it('also aborts when the caller\'s own signal does', async () => {
    const caller = new AbortController();
    const pending = timedFetch(60_000, hanging)('https://x', { signal: caller.signal });
    const settled = expect(pending).rejects.toThrow('aborted');
    caller.abort();
    await settled;
  });

  it('passes answers through and clears its timer', async () => {
    const answering = jest.fn(async () => new Response('ok')) as unknown as typeof fetch;
    const res = await timedFetch(1_000, answering)('https://x', { method: 'POST' });
    expect(await res.text()).toBe('ok');
    expect(jest.getTimerCount()).toBe(0);
  });
});
