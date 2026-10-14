// The rest between sets (M10c decision 8): two minutes, as the workout's own line says, counted from timestamps so the
// screen going off changes nothing. Pure, so the screen and its tests share it.

/** "Rest about 2 minutes between sets" (PLAY_TEXT.workout.rest). */
export const REST_MS = 120_000;
export const REST_MORE_MS = 15_000;

/** When the rest ends, or null with none running. */
export type Rest = { endsAt: number } | null;

export const startRest = (now: number): Rest => ({ endsAt: now + REST_MS });
export const moreRest = (rest: Rest, now: number): Rest => (rest === null ? null : { endsAt: Math.max(rest.endsAt, now) + REST_MORE_MS });
export const restLeft = (rest: Rest, now: number): number => (rest === null ? 0 : Math.max(0, rest.endsAt - now));

/** "1:45": minutes and seconds left, rounded up so it reads 0:01 until the end. */
export function restClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
