// The rest between sets (M10c decision 8): as long as the quest's own words say, counted from timestamps so the screen
// going off changes nothing. Pure, so the screen and its tests share it.

/** A workout: "Rest about 2 minutes between sets" (PLAY_TEXT.workout.rest, the workout steps). */
export const WORKOUT_REST_MS = 120_000;
/** A rep-log quest: "Rest about a minute between sets" (every strength ladder's steps; emulator check). */
export const REPS_REST_MS = 60_000;
export const REST_MORE_MS = 15_000;

/** When the rest ends, or null with none running. */
export type Rest = { endsAt: number } | null;

export const startRest = (now: number, ms: number): Rest => ({ endsAt: now + ms });
export const moreRest = (rest: Rest, now: number): Rest => (rest === null ? null : { endsAt: Math.max(rest.endsAt, now) + REST_MORE_MS });
export const restLeft = (rest: Rest, now: number): number => (rest === null ? 0 : Math.max(0, rest.endsAt - now));

/** "1:45": minutes and seconds left, rounded up so it reads 0:01 until the end. */
export function restClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
