// Lazy day closing and the next day (architecture §4.3, spec §2.4, §3.3, §3.7). Pure: it reads a snapshot of the
// player's state and returns what `levelmeup.advance` should write, or null when nothing is due. M7a: once a check-in is
// resolved, the days that waited behind it are applied in order, and "I just didn't" is settled when its recovery day ends.
import {
  DISCIPLINE_PER_CORE_DAY, LIGHT_DAY_MINUTES, RUNG_BONUS_XP, STREAK_SLOTS, abilityReady, applyDay, buildDay, closeLadders,
  closedDayResolution, followingDay, ladderById, provisionalDay, reenterLadders, resolveCheckin,
} from '../../../packages/rules/src/index.ts';
import type {
  ClosedDayResolution, DayInput, LadderState, ProvisionalQuest, QuestLibrary, Stat, StreakState,
} from '../../../packages/rules/src/index.ts';
import { toDraft } from './drafts.ts';
import { remapped } from './offline.ts';
import { dayWindow, ladderMap, pastDays, startPoints, statXp, streakState, toProfile } from './state.ts';
import type {
  CharacterRow, DayDraft, DayRow, InstanceDraft, InstanceRow, LadderRow, MissOutcome, PendingCheckin, ProfileRow, QueuedDay,
} from './state.ts';

export type AdvanceInput = {
  profile: ProfileRow;
  character: CharacterRow;
  ladders: readonly LadderRow[];
  /** The player's latest days (at least the last 7 and every open one). */
  days: readonly DayRow[];
  instances: readonly InstanceRow[];
  /** M7a: closed days waiting behind a check-in (Snapshot.queue), possibly older than `days`. */
  queue: readonly QueuedDay[];
  /** M7a: the check-in not yet resolved (Snapshot.checkin). */
  pending: PendingCheckin | null;
  /** Workouts completed so far, the days being closed included (Snapshot.workoutsDone). */
  workoutsDone: number;
  /** The phone's time zone now, canonical. */
  timeZone: string;
  nowMs: number;
  library: QuestLibrary;
  contentVersion: number;
  /** M6e: a day the phone built offline (its number and quests), kept when the rules allow it. */
  provisional?: { dayNumber: number; quests: readonly ProvisionalQuest[] };
};

export type LedgerLine = { sourceType: 'rung' | 'discipline' | 'milestone'; sourceId: string; stat: Stat; amount: number };

export type ClosedDayOutcome = {
  dayId: number;
  resolution: 'streak_day' | 'protected' | 'awaiting_checkin';
  /**
   * False when the day waits, in order, for the pending check-in's answer (the replay applies it once the check-in is
   * resolved). Once one day waits, every later day waits too, so answering late gives the same result as answering at
   * once (spec §3.7).
   */
  streakApplied: boolean;
  /**
   * This day opens a check-in. A pending one covers later unanswered days only while nothing waits behind it; a
   * missed day after a waiting day gets its check-in when the replay reaches it.
   */
  checkin: boolean;
};

/** M7a: a check-in the replay opens: a missed day, or away days between two days. */
export type Opened = { dayId: number } | { gapFrom: number; gapTo: number };

export type Outcome = {
  close: ClosedDayOutcome[];
  gap: { from: number; to: number } | null;
  /** Ladder states that changed. */
  ladders: Record<string, LadderState>;
  ledger: LedgerLine[];
  streak: StreakState;
  counters: { hardDaysCleared: number; comebacks: number; recoveriesCleared: number };
  newDay: DayDraft | null;
  /** Why the new day has no quests, for the function's log (not stored). */
  buildError: string | null;
  /** M6e: whose quests the new day has when the phone sent a day it built offline (null without one), and why not its own. */
  offline: { kept: 'phone' | 'server'; problems: string[] } | null;
  /** M7a (decision 5): days that waited behind a check-in, applied now, in day order. */
  applied: number[];
  /** Check-ins the replay opened. */
  opened: Opened[];
  /** "I just didn't", settled when its recovery day ended (decision 4). */
  resolved: { id: number; outcome: MissOutcome } | null;
  /** Unbreakable, used on that miss (decision 8). */
  ability: { id: 'unbreakable'; day: number } | null;
  /** The new day is the light day a check-in answer asked for (decision 6). */
  lightUsed: boolean;
};

export function planAdvance(input: AdvanceInput): Outcome | null {
  const { library, nowMs, profile } = input;
  const days = [...input.days].sort((a, b) => a.day_number - b.day_number);
  if (days.length === 0) return null;
  const ladders = ladderMap(input.ladders);
  const changed: Record<string, LadderState> = {};
  const setLadders = (states: Readonly<Record<string, LadderState>>): void => {
    Object.assign(ladders, states);
    Object.assign(changed, states);
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
  const queue = [...input.queue].sort((a, b) => a.day_number - b.day_number);
  const close: ClosedDayOutcome[] = [];
  const counters = { hardDaysCleared: 0, comebacks: 0, recoveriesCleared: 0 };
  const applied: number[] = [];
  const opened: Opened[] = [];
  let resolved: Outcome['resolved'] = null;
  let ability: Outcome['ability'] = null;

  /** Applies a closed day to the streak (with its milestone); true when it opens a check-in. */
  const applyClosed = (dayNumber: number, resolution: ClosedDayResolution): boolean => {
    const opens = resolution.kind === 'awaiting_checkin' && !streak.awaitingCheckin;
    const change = applyDay(streak, resolution);
    streak = change.state;
    if (change.milestoneXp > 0) pay({ sourceType: 'milestone', sourceId: `day:${dayNumber}`, stat: 'discipline', amount: change.milestoneXp });
    return opens;
  };

  /**
   * M7a (decision 5): while no check-in is pending, the days that waited behind one are applied in day order, as if it
   * had been answered at once. A missed day among them opens its own check-in and away days (a jump in day numbers) one
   * gap check-in; missed days right after it share that check-in, as they would have (M7a review), and the days after
   * them keep waiting. `next` is the number of the first day after the queue, when one exists.
   */
  const drain = (next: number | null): void => {
    while (queue.length > 0 && (!streak.awaitingCheckin || queue[0]!.resolution === 'awaiting_checkin')) {
      const day = queue.shift()!;
      if (applyClosed(day.day_number, { kind: day.resolution })) opened.push({ dayId: Number(day.id) });
      applied.push(Number(day.id));
      const after = queue[0]?.day_number ?? next;
      if (!streak.awaitingCheckin && after !== null && after > day.day_number + 1) {
        streak = applyDay(streak, { kind: 'awaiting_checkin' }).state;
        opened.push({ gapFrom: day.day_number + 1, gapTo: after - 1 });
      }
    }
  };

  /** "I just didn't" is settled when its recovery day ends (decisions 4, 8): recovered, Unbreakable, a shield or a reset. */
  const settles = (day: DayRow): boolean =>
    input.pending !== null && input.pending.answer === 'just_didnt' && String(input.pending.recovery_day_id) === String(day.id)
    && streak.awaitingCheckin;
  const settle = (pending: PendingCheckin, dayNumber: number): void => {
    const { recovered } = pending;
    const player = rulesProfile();
    const unbreakable = !recovered
      && abilityReady('unbreakable', player.classId, player.level, input.character.ability_last_used.unbreakable ?? null, dayNumber);
    const change = resolveCheckin(streak, { kind: 'miss', recovered, shieldWaived: unbreakable });
    streak = change.state;
    resolved = { id: Number(pending.id), outcome: recovered ? 'recovered' : unbreakable ? 'unbreakable' : change.shieldUsed ? 'shield' : 'reset' };
    if (unbreakable) ability = { id: 'unbreakable', day: dayNumber };
    if (recovered) counters.recoveriesCleared++;
  };

  // A check-in resolved since the last run (a protected answer) lets the waiting days go now.
  drain(days.find((d) => d.status === 'open')?.day_number ?? null);

  for (const day of days) {
    if (day.status !== 'open' || day.ends_at.getTime() > nowMs) continue;
    if (settles(day)) settle(input.pending!, day.day_number);
    drain(day.day_number);
    const quests = input.instances.filter((q) => String(q.day_id) === String(day.id));
    const done = quests.filter((q) => q.completed_at !== null);
    const coreDone = done.some((q) => q.slot === 'core');
    const questsDone = done.filter((q) => STREAK_SLOTS.includes(q.slot)).length;
    const resolution = closedDayResolution({ coreDone, questsDone, protection: day.protection });

    let streakApplied = true;
    let checkin = false;
    if (queue.length > 0 || (streak.awaitingCheckin && resolution.kind !== 'awaiting_checkin')) {
      streakApplied = false;
      queue.push({ id: day.id, day_number: day.day_number, resolution: resolution.kind });
    } else {
      checkin = applyClosed(day.day_number, resolution);
    }
    if (coreDone) pay({ sourceType: 'discipline', sourceId: `day:${day.day_number}`, stat: 'discipline', amount: DISCIPLINE_PER_CORE_DAY });
    // A hard day counts only when its core quest was done in its hard-day version: calling one after clearing the core
    // at full XP earns nothing (M6b review).
    if (done.some((q) => q.slot === 'core' && q.hard_day)) counters.hardDaysCleared++;
    if (coreDone && day.comeback) counters.comebacks++;

    // Ladders move only now, with each quest's final rating and the rung it was built at (M1 review). A protected
    // day (planned rest, no quests) never counts as a missed session. The phone closes a day it holds the same way (M6e).
    // A completion counted for another quest (M6e review) moves no ladder: the player did the phone's quest.
    const closed = closeLadders(library, ladders, {
      startsAt: day.starts_at.getTime(),
      protected: day.protection !== null,
      quests: quests.map((q) => ({ ladder: remapped(q) ? null : q.ladder_id, rung: q.rung, done: q.completed_at !== null, rating: q.rating })),
    }, rulesProfile());
    setLadders(closed.changed);
    for (const { ladder, rung } of closed.newRungs) {
      pay({ sourceType: 'rung', sourceId: `rung:${ladder}:${rung}`, stat: ladderById(library, ladder).stat, amount: RUNG_BONUS_XP });
    }
    close.push({ dayId: Number(day.id), resolution: resolution.kind, streakApplied, checkin });
  }

  const running = days.some((d) => (d.status === 'open' && !close.some((c) => c.dayId === Number(d.id))));
  let newDay: DayDraft | null = null;
  let gap: Outcome['gap'] = null;
  let buildError: string | null = null;
  let offline: Outcome['offline'] = null;
  let lightUsed = false;
  if (!running) {
    const last = days[days.length - 1]!;
    const { window, dayNumber, away, comeback } = followingDay(dayWindow(last), last.day_number, input.timeZone, profile.boundary_minutes, nowMs);

    // Away days are one gap check-in; a pending check-in covers them; behind a waiting day they wait too (the replay
    // finds them from the jump in day numbers).
    if (away > 0 && !streak.awaitingCheckin && queue.length === 0) {
      streak = applyDay(streak, { kind: 'awaiting_checkin' }).state;
      gap = { from: last.day_number + 1, to: dayNumber - 1 };
    }
    // Measured in time, like recordReentry, so a light comeback day and the rung step-down always come together.
    if (comeback) setLadders(reenterLadders(ladders, window.startsAt, last.ends_at.getTime()));

    const history = pastDays(days, input.instances).slice(-7);
    // A "sick" or "injured" answer asked for a light next day (decision 6); the flag is used up with it.
    const light = comeback || input.character.next_day_light;
    lightUsed = input.character.next_day_light;
    const dayInput: DayInput = {
      dayNumber, profile: rulesProfile(), ladders, history, light, workoutsDone: input.workoutsDone, articleId: null,
    };
    let quests: InstanceDraft[] = [];
    let budget = light ? LIGHT_DAY_MINUTES : profile.minutes_per_day;
    let protection: DayDraft['protection'] = null;
    // The phone's day when the rules allow it (M6e decision 5), re-drafted from the server's tables. When the rules can't
    // read it at all, the server's own day is stored (review): a queued event must never fail every sync.
    let phone: ReturnType<typeof provisionalDay> | null = null;
    if (input.provisional !== undefined) {
      try {
        phone = provisionalDay(library, dayInput, input.provisional.dayNumber, input.provisional.quests);
      } catch (error) {
        phone = { day: null, problems: [error instanceof Error ? error.message : String(error)] };
      }
    }
    if (phone !== null) offline = { kept: phone.day === null ? 'server' : 'phone', problems: phone.problems };
    if (phone !== null && phone.day !== null) {
      quests = phone.day.quests.map((q) => toDraft(library, q));
      budget = phone.day.budget;
    } else {
      try {
        const built = buildDay(library, dayInput);
        quests = built.quests.map((q) => toDraft(library, q));
        budget = built.budget;
      } catch (error) {
        // A day that can't be built is protected automatically (spec §3.7): never a miss the player didn't cause.
        protection = 'no_quests';
        buildError = error instanceof Error ? error.message : String(error);
      }
    }
    newDay = {
      dayNumber,
      startsAt: new Date(window.startsAt).toISOString(),
      endsAt: new Date(window.endsAt).toISOString(),
      timeZone: window.timeZone,
      budget,
      light,
      comeback,
      articleId: null,
      protection,
      contentVersion: input.contentVersion,
      quests,
    };
  }

  const replayed = applied.length > 0 || opened.length > 0 || resolved !== null;
  if (close.length === 0 && newDay === null && !replayed) return null;
  return {
    close, gap, ladders: changed, ledger, streak, counters, newDay, buildError, offline, applied, opened, resolved, ability, lightUsed,
  };
}
