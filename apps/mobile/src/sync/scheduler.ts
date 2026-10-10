// When syncs run (M4 plan decision 6): one at a time; a request during a run adds one more run; offline or retryable
// outcomes try again after 5 s, 15 s, 30 s, 60 s, 2 min, then every 5 min. Callers request a run at launch, on
// foreground, when the network returns, when today ends and after queuing an event.
// M4 code review: a run that never settles counts as a retry after `deadlineMs`, so the schedule can't get stuck; and
// `exclusive` lets onboarding and deletion run with no sync in flight, so a late answer can't overwrite them.
import type { SyncOutcome } from './engine.ts';

export const BACKOFF_MS = [5_000, 15_000, 30_000, 60_000, 120_000, 300_000] as const;
export const RUN_DEADLINE_MS = 120_000;

export function makeScheduler(
  run: () => Promise<SyncOutcome>,
  onOutcome: (outcome: SyncOutcome) => void | Promise<void>,
  deadlineMs: number = RUN_DEADLINE_MS,
) {
  let running: Promise<void> | null = null;
  let held: Promise<unknown> | null = null;
  let again = false;
  let failures = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const clear = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const withDeadline = (work: Promise<SyncOutcome>): Promise<SyncOutcome> =>
    new Promise((resolve, reject) => {
      const deadline = setTimeout(() => resolve({ kind: 'retry', code: 'timeout' }), deadlineMs);
      work.then(
        (outcome) => {
          clearTimeout(deadline);
          resolve(outcome);
        },
        (error: unknown) => {
          clearTimeout(deadline);
          reject(error);
        },
      );
    });

  async function loop(): Promise<void> {
    do {
      again = false;
      let outcome: SyncOutcome;
      try {
        outcome = await withDeadline(run());
      } catch (error) {
        outcome = { kind: 'retry', code: error instanceof Error ? error.message : String(error) };
      }
      try {
        await onOutcome(outcome);
      } catch {
        // The handler reports its own errors; the schedule must keep running either way.
      }
      if (outcome.kind === 'offline' || outcome.kind === 'retry') {
        const wait = BACKOFF_MS[Math.min(failures, BACKOFF_MS.length - 1)]!;
        failures++;
        if (!again && !stopped) {
          clear();
          timer = setTimeout(() => {
            timer = null;
            void request();
          }, wait);
        }
      } else {
        failures = 0;
        clear();
      }
    } while (again && !stopped);
    running = null;
  }

  function request(): Promise<void> {
    if (stopped) return Promise.resolve();
    if (held !== null) return held.then(request, request);
    if (running !== null) {
      again = true;
      return running;
    }
    clear();
    running = loop();
    return running;
  }

  /** Runs `fn` with no sync in flight; sync requests made meanwhile run after it. */
  async function exclusive<T>(fn: () => Promise<T>): Promise<T> {
    while (held !== null) await held.then(() => undefined, () => undefined);
    const section = (async () => {
      while (running !== null) await running;
      return fn();
    })();
    held = section;
    try {
      return await section;
    } finally {
      held = null;
    }
  }

  return {
    request,
    exclusive,
    stop(): void {
      stopped = true;
      clear();
    },
  };
}

export type Scheduler = ReturnType<typeof makeScheduler>;
