// What happens to a player's ladders and calendar when a quest day ends (architecture §4.3). The server's advance and
// the phone's offline day (M6e) share it, so both close a day the same way.
import { DAY_MS, MAX_AWAY_DAYS, REENTRY_AWAY_MS } from './constants.ts';
import { newLadder, recordCompletion, recordMiss, recordReentry } from './ladder.ts';
import type { LadderState, Rating } from './ladder.ts';
import { maxRungFor } from './library.ts';
import type { PlayerProfile, QuestLibrary } from './library.ts';
import { firstDayWindow, nextDayWindow } from './time.ts';
import type { DayWindow } from './time.ts';

/** A quest of a closing day, as far as its ladder cares. */
export type ClosingQuest = { ladder: string | null; rung: number | null; done: boolean; rating: Rating | null };

export type ClosedLadders = {
  /** The ladders that changed, by id. */
  changed: Record<string, LadderState>;
  /** Rungs reached for the first time: each pays RUNG_BONUS_XP to its ladder's stat. */
  newRungs: { ladder: string; rung: number }[];
};

/**
 * A closing day's ladder sessions (M1 review): each ladder quest records its completion with its final rating ("right"
 * when unrated) at the rung it was built at, or a missed session; a protected day (planned rest, pain, no quests) never
 * counts as missed. Ladders this content doesn't know are skipped.
 */
export function closeLadders(
  library: QuestLibrary,
  ladders: Readonly<Record<string, LadderState>>,
  day: { startsAt: number; protected: boolean; quests: readonly ClosingQuest[] },
  profile: PlayerProfile,
): ClosedLadders {
  const known = new Set(library.ladders.map((l) => l.id));
  const current: Record<string, LadderState> = { ...ladders };
  const changed: Record<string, LadderState> = {};
  const newRungs: ClosedLadders['newRungs'] = [];
  for (const q of day.quests) {
    if (q.ladder === null || q.rung === null || !known.has(q.ladder)) continue;
    const state = current[q.ladder] ?? newLadder();
    if (q.done) {
      const maxRung = maxRungFor(library, q.ladder, profile);
      const change = recordCompletion(state, { at: day.startsAt, rung: q.rung, rating: q.rating ?? 'right', difficulty: profile.difficulty, maxRung });
      current[q.ladder] = changed[q.ladder] = change.state;
      if (change.newHighestRung) newRungs.push({ ladder: q.ladder, rung: change.state.rung });
    } else if (!day.protected) {
      current[q.ladder] = changed[q.ladder] = recordMiss(state, { at: day.startsAt, rung: q.rung }).state;
    }
  }
  return { changed, newRungs };
}

/** The first day back after REENTRY_AWAY_MS or more away (spec §3.3): the ladders that step down. */
export function reenterLadders(ladders: Readonly<Record<string, LadderState>>, startsAt: number, lastEndsAt: number): Record<string, LadderState> {
  const changed: Record<string, LadderState> = {};
  for (const [id, state] of Object.entries(ladders)) {
    const change = recordReentry(state, startsAt, lastEndsAt);
    if (change.steppedDown) changed[id] = change.state;
  }
  return changed;
}

export type NextDay = { window: DayWindow; dayNumber: number; away: number; comeback: boolean };

/**
 * The quest day after `last` that is still running at `nowMs` (architecture §4.3): the days that ended meanwhile are
 * away days, counted one by one up to MAX_AWAY_DAYS; a longer absence starts a fresh day from now. A comeback day starts
 * REENTRY_AWAY_MS or more after the last one ended: it is light, and the rungs step down.
 */
export function followingDay(last: DayWindow, lastDayNumber: number, timeZone: string, boundaryMinutes: number, nowMs: number): NextDay {
  let next = nextDayWindow(last, timeZone, boundaryMinutes);
  let away = 0;
  while (next.endsAt <= nowMs && away < MAX_AWAY_DAYS) {
    away++;
    next = nextDayWindow(next, timeZone, boundaryMinutes);
  }
  if (next.endsAt <= nowMs) {
    next = firstDayWindow(nowMs, timeZone, boundaryMinutes);
    away = Math.max(away, Math.floor((nowMs - last.endsAt) / DAY_MS));
  }
  return { window: next, dayNumber: lastDayNumber + 1 + away, away, comeback: next.startsAt - last.endsAt >= REENTRY_AWAY_MS };
}
