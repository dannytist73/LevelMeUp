// When syncs run (M4 plan decision 6): one at a time; a request during a run adds one more run; offline or retryable
// outcomes try again after 5 s, 15 s, 30 s, 60 s, 2 min, then every 5 min. Callers request a run at launch, on
// foreground, when the network returns and after queuing an event.
import type { SyncOutcome } from './engine.ts';

export const BACKOFF_MS = [5_000, 15_000, 30_000, 60_000, 120_000, 300_000] as const;

export function makeScheduler(run: () => Promise<SyncOutcome>, onOutcome: (outcome: SyncOutcome) => void | Promise<void>) {
  let running: Promise<void> | null = null;
  let again = false;
  let failures = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const clear = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  async function loop(): Promise<void> {
    do {
      again = false;
      let outcome: SyncOutcome;
      try {
        outcome = await run();
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
    if (running !== null) {
      again = true;
      return running;
    }
    clear();
    running = loop();
    return running;
  }

  return {
    request,
    stop(): void {
      stopped = true;
      clear();
    },
  };
}

export type Scheduler = ReturnType<typeof makeScheduler>;
