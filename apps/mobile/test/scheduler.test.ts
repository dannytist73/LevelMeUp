/** @jest-environment node */
import { BACKOFF_MS, makeScheduler } from '../src/sync/scheduler.ts';
import type { SyncOutcome } from '../src/sync/engine.ts';

const synced: SyncOutcome = { kind: 'synced', state: {} as never, notices: [], newAchievements: [] };
const offline: SyncOutcome = { kind: 'offline' };

function harness(outcomes: SyncOutcome[]) {
  let release: (() => void) | null = null;
  const runs: number[] = [];
  const seen: SyncOutcome[] = [];
  const run = jest.fn(async () => {
    runs.push(Date.now());
    return outcomes.length > 1 ? outcomes.shift()! : outcomes[0]!;
  });
  const scheduler = makeScheduler(run, (o) => void seen.push(o));
  return { run, runs, seen, scheduler, hold: () => new Promise<void>((r) => (release = r)), release: () => release?.() };
}

beforeEach(() => jest.useFakeTimers({ now: 0 }));
afterEach(() => jest.useRealTimers());

describe('when syncs run', () => {
  it('requests during a run add exactly one more run', async () => {
    let finish!: () => void;
    const run = jest.fn(() => new Promise<SyncOutcome>((resolve) => (finish = () => resolve(synced))));
    const scheduler = makeScheduler(run, () => {});
    const first = scheduler.request();
    void scheduler.request();
    void scheduler.request();
    finish();
    await jest.advanceTimersByTimeAsync(0);
    finish();
    await first;
    expect(run).toHaveBeenCalledTimes(2);
    scheduler.stop();
  });

  it('offline retries after 5, 15, 30, 60, 120 and 300 s, then every 300 s', async () => {
    const { runs, scheduler } = harness([offline]);
    await scheduler.request();
    await jest.advanceTimersByTimeAsync(BACKOFF_MS.reduce((a, b) => a + b, 0) + 300_000 * 2);
    const gaps = runs.slice(1).map((t, i) => t - runs[i]!);
    expect(gaps).toEqual([5_000, 15_000, 30_000, 60_000, 120_000, 300_000, 300_000, 300_000]);
    scheduler.stop();
  });

  it('a success resets the wait', async () => {
    const { runs, scheduler } = harness([offline, offline, synced, offline]);
    await scheduler.request();
    await jest.advanceTimersByTimeAsync(5_000 + 15_000);
    await scheduler.request(); // synced now (third outcome) — then offline again
    await jest.advanceTimersByTimeAsync(5_000);
    const gaps = runs.slice(1).map((t, i) => t - runs[i]!);
    expect(gaps.slice(-1)).toEqual([5_000]);
    scheduler.stop();
  });

  it.each([
    ['not started', { kind: 'not_started' }],
    ['the sign-in is gone', { kind: 'session_ended' }],
    ['a request bug', { kind: 'failed', status: 400, code: 'bad_body' }],
    ['synced', synced],
  ] as const)('%s: no retry', async (_, outcome) => {
    const { run, scheduler } = harness([outcome as SyncOutcome]);
    await scheduler.request();
    await jest.advanceTimersByTimeAsync(3_600_000);
    expect(run).toHaveBeenCalledTimes(1);
    scheduler.stop();
  });

  it('a run that throws counts as a retry and is reported', async () => {
    const seen: SyncOutcome[] = [];
    const run = jest.fn().mockRejectedValueOnce(new Error('disk full')).mockResolvedValue(synced);
    const scheduler = makeScheduler(run, (o) => void seen.push(o));
    await scheduler.request();
    expect(seen[0]).toEqual({ kind: 'retry', code: 'disk full' });
    await jest.advanceTimersByTimeAsync(5_000);
    expect(run).toHaveBeenCalledTimes(2);
    scheduler.stop();
  });

  it('a run that never settles counts as a retry after the deadline, so syncing can\'t get stuck (M4 code review)', async () => {
    const seen: SyncOutcome[] = [];
    const run = jest.fn().mockReturnValueOnce(new Promise(() => {})).mockResolvedValue(synced);
    const scheduler = makeScheduler(run, (o) => void seen.push(o), 120_000);
    const first = scheduler.request();
    await jest.advanceTimersByTimeAsync(120_000);
    await first;
    expect(seen).toEqual([{ kind: 'retry', code: 'timeout' }]);
    await scheduler.request();
    expect(run).toHaveBeenCalledTimes(2);
    expect(seen[1]).toEqual(synced);
    scheduler.stop();
  });

  it('exclusive work waits for the run in flight, and runs requested meanwhile wait for it', async () => {
    const order: string[] = [];
    let finish!: () => void;
    const run = jest.fn(() => {
      order.push('run starts');
      return new Promise<SyncOutcome>((resolve) => (finish = () => {
        order.push('run ends');
        resolve(synced);
      }));
    });
    const scheduler = makeScheduler(run, () => {});
    const inFlight = scheduler.request();
    const work = scheduler.exclusive(async () => {
      order.push('exclusive');
      void scheduler.request(); // asked for during the exclusive work
      await jest.advanceTimersByTimeAsync(0);
      order.push('exclusive done');
      return 7;
    });
    await jest.advanceTimersByTimeAsync(0);
    finish();
    expect(await work).toBe(7);
    await inFlight;
    await jest.advanceTimersByTimeAsync(0);
    finish();
    await jest.advanceTimersByTimeAsync(0);
    expect(order).toEqual(['run starts', 'run ends', 'exclusive', 'exclusive done', 'run starts', 'run ends']);
    scheduler.stop();
  });

  it('stop() cancels the pending retry and ignores later requests', async () => {
    const { run, scheduler } = harness([offline]);
    await scheduler.request();
    scheduler.stop();
    await jest.advanceTimersByTimeAsync(600_000);
    await scheduler.request();
    expect(run).toHaveBeenCalledTimes(1);
  });
});
