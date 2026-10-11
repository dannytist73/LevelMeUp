// Lazy day closing and the next day (architecture §4.3, spec §2.4, §3.3, §3.7). Pure: it reads a snapshot of the
// player's state and returns what `levelmeup.advance` should write, or null when nothing is due.
import {
  DAY_MS, DISCIPLINE_PER_CORE_DAY, LIGHT_DAY_MINUTES, REENTRY_AWAY_MS, RUNG_BONUS_XP, STREAK_SLOTS, applyDay, buildDay,
  closedDayResolution, firstDayWindow, ladderById, maxRungFor, newLadder, nextDayWindow, recordCompletion, recordMiss,
  recordReentry,
} from '../../../packages/rules/src/index.ts';
import type { DayWindow, LadderChange, LadderState, QuestLibrary, Stat, StreakState } from '../../../packages/rules/src/index.ts';
import { toDraft } from './drafts.ts';
import { dayWindow, ladderMap, pastDays, startPoints, statXp, streakState, toProfile } from './state.ts';
import type { CharacterRow, DayDraft, DayRow, InstanceDraft, InstanceRow, LadderRow, ProfileRow } from './state.ts';

export type AdvanceInput = {
  profile: ProfileRow;
  character: CharacterRow;
  ladders: readonly LadderRow[];
  /** The player's latest days (at least the last 7 and every open one). */
  days: readonly DayRow[];
  instances: readonly InstanceRow[];
  /** A closed day already waits behind the pending check-in (Snapshot.queued). */
  queued: boolean;
  /** Workouts completed so far, the days being closed included (Snapshot.workoutsDone). */
  workoutsDone: number;
  /** The phone's time zone now, canonical. */
  timeZone: string;
  nowMs: number;
  library: QuestLibrary;
  contentVersion: number;
};

export type LedgerLine = { sourceType: 'rung' | 'discipline' | 'milestone'; sourceId: string; stat: Stat; amount: number };

export type ClosedDayOutcome = {
  dayId: number;
  resolution: 'streak_day' | 'protected' | 'awaiting_checkin';
  /**
   * False when the day waits, in order, for the pending check-in's answer (M7 applies it then). Once one day waits,
   * every later day waits too, so answering late gives the same result as answering at once (spec §3.7).
   */
  streakApplied: boolean;
  /**
   * This day opens a check-in. A pending one covers later unanswered days only while nothing waits behind it; a
   * missed day after a waiting day gets its check-in when M7 replays the queue.
   */
  checkin: boolean;
};

export type Outcome = {
  close: ClosedDayOutcome[];
  gap: { from: number; to: number } | null;
  /** Ladder states that changed. */
  ladders: Record<string, LadderState>;
  ledger: LedgerLine[];
  streak: StreakState;
  counters: { hardDaysCleared: number; comebacks: number };
  newDay: DayDraft | null;
  /** Why the new day has no quests, for the function's log (not stored). */
  buildError: string | null;
};

/** Away days counted one by one; a longer absence starts a fresh day from now. */
const MAX_AWAY_DAYS = 400;

export function planAdvance(input: AdvanceInput): Outcome | null {
  const { library, nowMs, profile } = input;
  const days = [...input.days].sort((a, b) => a.day_number - b.day_number);
  if (days.length === 0) return null;
  const knownLadders = new Set(library.ladders.map((l) => l.id));
  const ladders = ladderMap(input.ladders);
  const changed: Record<string, LadderState> = {};
  const setLadder = (id: string, change: LadderChange): void => {
    ladders[id] = change.state;
    changed[id] = change.state;
  };
  const start = startPoints(input.character);
  const xp = statXp(input.character);
  const ledger: LedgerLine[] = [];
  const pay = (line: LedgerLine): void => {
    ledger.push(line);
    xp[line.stat] += line.amount;
  };
  const rulesProfile = () => toProfile(profile, start, xp);
  let streak = streakState(input.character);
  let queued = input.queued;
  const close: ClosedDayOutcome[] = [];
  const counters = { hardDaysCleared: 0, comebacks: 0 };

  for (const day of days) {
    if (day.status !== 'open' || day.ends_at.getTime() > nowMs) continue;
    const quests = input.instances.filter((q) => String(q.day_id) === String(day.id));
    const done = quests.filter((q) => q.completed_at !== null);
    const coreDone = done.some((q) => q.slot === 'core');
    const questsDone = done.filter((q) => STREAK_SLOTS.includes(q.slot)).length;
    const resolution = closedDayResolution({ coreDone, questsDone, protection: day.protection });

    let streakApplied = true;
    let checkin = false;
    if (queued || (streak.awaitingCheckin && resolution.kind !== 'awaiting_checkin')) {
      streakApplied = false;
      queued = true;
    } else {
      checkin = resolution.kind === 'awaiting_checkin' && !streak.awaitingCheckin;
      const change = applyDay(streak, resolution);
      streak = change.state;
      if (change.milestoneXp > 0) {
        pay({ sourceType: 'milestone', sourceId: `day:${day.day_number}`, stat: 'discipline', amount: change.milestoneXp });
      }
    }
    if (coreDone) pay({ sourceType: 'discipline', sourceId: `day:${day.day_number}`, stat: 'discipline', amount: DISCIPLINE_PER_CORE_DAY });
    // A hard day counts only when its core quest was done in its hard-day version: calling one after clearing the core
    // at full XP earns nothing (M6b review).
    if (done.some((q) => q.slot === 'core' && q.hard_day)) counters.hardDaysCleared++;
    if (coreDone && day.comeback) counters.comebacks++;

    // Ladders move only now, with each quest's final rating and the rung it was built at (M1 review). A protected
    // day (planned rest, no quests) never counts as a missed session.
    const at = day.starts_at.getTime();
    for (const q of quests) {
      if (q.ladder_id === null || q.rung === null || !knownLadders.has(q.ladder_id)) continue;
      const state = ladders[q.ladder_id] ?? newLadder();
      if (q.completed_at !== null) {
        const maxRung = maxRungFor(library, q.ladder_id, rulesProfile());
        const change = recordCompletion(state, { at, rung: q.rung, rating: q.rating ?? 'right', difficulty: profile.difficulty, maxRung });
        setLadder(q.ladder_id, change);
        if (change.newHighestRung) {
          pay({ sourceType: 'rung', sourceId: `rung:${q.ladder_id}:${change.state.rung}`, stat: ladderById(library, q.ladder_id).stat, amount: RUNG_BONUS_XP });
        }
      } else if (day.protection === null) {
        setLadder(q.ladder_id, recordMiss(state, { at, rung: q.rung }));
      }
    }
    close.push({ dayId: Number(day.id), resolution: resolution.kind, streakApplied, checkin });
  }

  const running = days.some((d) => (d.status === 'open' && !close.some((c) => c.dayId === Number(d.id))));
  let newDay: DayDraft | null = null;
  let gap: Outcome['gap'] = null;
  let buildError: string | null = null;
  if (!running) {
    const last = days[days.length - 1]!;
    let window: DayWindow = nextDayWindow(dayWindow(last), input.timeZone, profile.boundary_minutes);
    let away = 0;
    while (window.endsAt <= nowMs && away < MAX_AWAY_DAYS) {
      away++;
      window = nextDayWindow(window, input.timeZone, profile.boundary_minutes);
    }
    if (window.endsAt <= nowMs) {
      window = firstDayWindow(nowMs, input.timeZone, profile.boundary_minutes);
      away = Math.max(away, Math.floor((nowMs - last.ends_at.getTime()) / DAY_MS));
    }
    const dayNumber = last.day_number + 1 + away;

    // Away days are one gap check-in; a pending check-in covers them; behind a waiting day they wait too (M7 replays
    // them from the jump in day numbers).
    if (away > 0 && !streak.awaitingCheckin && !queued) {
      streak = applyDay(streak, { kind: 'awaiting_checkin' }).state;
      gap = { from: last.day_number + 1, to: dayNumber - 1 };
    }
    // Measured in time, like recordReentry, so a light comeback day and the rung step-down always come together.
    const comeback = window.startsAt - last.ends_at.getTime() >= REENTRY_AWAY_MS;
    if (comeback) {
      for (const id of Object.keys(ladders)) {
        const change = recordReentry(ladders[id]!, window.startsAt, last.ends_at.getTime());
        if (change.steppedDown) setLadder(id, change);
      }
    }

    const history = pastDays(days, input.instances).slice(-7);
    let quests: InstanceDraft[] = [];
    let budget = comeback ? LIGHT_DAY_MINUTES : profile.minutes_per_day;
    let protection: DayDraft['protection'] = null;
    try {
      const built = buildDay(library, { dayNumber, profile: rulesProfile(), ladders, history, light: comeback, workoutsDone: input.workoutsDone, articleId: null });
      quests = built.quests.map((q) => toDraft(library, q));
      budget = built.budget;
    } catch (error) {
      // A day that can't be built is protected automatically (spec §3.7): never a miss the player didn't cause.
      protection = 'no_quests';
      buildError = error instanceof Error ? error.message : String(error);
    }
    newDay = {
      dayNumber,
      startsAt: new Date(window.startsAt).toISOString(),
      endsAt: new Date(window.endsAt).toISOString(),
      timeZone: window.timeZone,
      budget,
      light: comeback,
      comeback,
      articleId: null,
      protection,
      contentVersion: input.contentVersion,
      quests,
    };
  }

  if (close.length === 0 && newDay === null) return null;
  return { close, gap, ladders: changed, ledger, streak, counters, newDay, buildError };
}
