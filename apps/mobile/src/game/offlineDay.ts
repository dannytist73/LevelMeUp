// The next quest day, built on the phone when the day on screen has ended and the server can't be reached (M6e,
// architecture §6). It closes the ended day the way the server does (rules: closing.ts) with what the phone shows, then
// builds with the same rules (`buildDay`); the server checks it when it syncs (`checkProvisionalDay`).
import { LIBRARY } from '@levelmeup/content';
import {
  BLOCK_RESTART_MS, DAY_MS, DISCIPLINE_PER_CORE_DAY, LATE_SYNC_MS, RUNG_BONUS_XP, TRAINABLE_STATS, buildDay, closeLadders, followingDay, ladderById, newLadder,
  recordPain, reenterLadders, resumeAfterPain, stepDown,
} from '@levelmeup/rules';
import type { LadderState, PastDay, PlayerProfile, TrainableStat, XpByStat } from '@levelmeup/rules';
import { addStatXp, project } from './project.ts';
import type { Shown } from './project.ts';
import type { CharacterView, PhoneEvent, ProvisionalDayEvent, ServerState, TodayView } from './types.ts';

/** The rules' view of the player, from what the phone shows. */
export function rulesProfile(profile: ServerState['profile'], character: CharacterView): PlayerProfile {
  return {
    classId: profile.classId,
    level: character.level,
    goals: profile.goals,
    minutesPerDay: profile.minutesPerDay,
    difficulty: profile.difficulty,
    limitations: profile.limitations,
    gentleStart: profile.gentleStart,
    ownProgram: profile.ownProgram,
    equipment: profile.equipment,
    programStyle: profile.programStyle,
    // M16: a state cached before the weekly program has neither: the step-by-step plan.
    trainingPlan: (profile as Partial<typeof profile>).trainingPlan ?? 'build',
    programDays: (profile as Partial<typeof profile>).programDays ?? 3,
    stats: Object.fromEntries(TRAINABLE_STATS.map((s) => [s, character.stats[s].points])) as Record<TrainableStat, number>,
    book: profile.book,
  };
}

const sessionsDone = (today: TodayView | null): number =>
  (today?.quests ?? []).filter((q) => q.condition.kind === 'session' && q.completedAt !== null).length;

/** M16: the weekly workouts that count on a day, as the server counts them (the full version, not rated too hard). */
const programDoneOn = (today: TodayView | null) =>
  (today?.quests ?? []).filter((q) => q.ladder === 'program' && q.completedAt !== null && !q.hardDay && q.rating !== 'too_hard');

/**
 * What the offline day is built from: the cached state with the unsent events, except check-in answers. The server
 * applies those after the batch's other events, so after the ended day closes and the offline day is stored (M7a
 * review): a light day, a rested exercise or fewer minutes from an answer still on its way come the day after.
 */
export function offlineView(server: ServerState, pending: readonly PhoneEvent[]): Shown {
  return project(server, pending.filter((e) => e.type !== 'checkin'));
}

/**
 * What a day's close leaves for the next one: the server's own, or what the phone worked out closing a day it built
 * (premium pass A6). `bonus`: the XP the phone's closes paid (Discipline, rung bonuses), which the projection doesn't hold.
 */
type Held = {
  ladders: Record<string, LadderState>;
  history: readonly PastDay[];
  workoutsDone: number;
  programDone: number;
  programLastAt: string | null;
  bonus: readonly XpByStat[];
};

/** Premium pass A6: days built here in a row, at most; past that, completions would reach the server too late to count. */
export const MAX_OFFLINE_DAYS = Math.floor(LATE_SYNC_MS / DAY_MS);

type Built = { event: Omit<ProvisionalDayEvent, 'id'>; held: Held };

/**
 * Closes the ended day `shown.today` as the server will, then builds the next one with the same rules. `baseline`: the
 * server's own day, whose completions the server's counts already hold (none for a day this phone built). `first`: the
 * day closed is the server's, so a light day asked for and the named article apply. `changes`: the ladder changes made
 * on that day (review: a pain report on a day the phone built rests the exercise in the next one too).
 */
function step(
  shown: Shown, held: Held, baseline: TodayView | null, first: boolean, changes: Shown['ladderChanges'], nowMs: number, timeZone: string,
): Built | null {
  const today = shown.today;
  if (today === null || today.startsAt === null || today.endsAt === null) return null;
  const last = { startsAt: Date.parse(today.startsAt), endsAt: Date.parse(today.endsAt), timeZone: today.timeZone };
  if (last.endsAt > nowMs) return null;
  try {
    const next = followingDay(last, today.dayNumber, timeZone, shown.profile.boundaryMinutes, nowMs);
    // Changes still on their way come first, as the server applies events before it closes a day (review): "I felt
    // pain" rests an exercise, Resume brings it back a rung easier, a step-down lowers its ladder.
    const beforeClose: Record<string, LadderState> = { ...held.ladders };
    for (const { key, change } of changes) {
      const state = beforeClose[key] ?? newLadder();
      if (change === 'pain') beforeClose[key] = recordPain(state).state;
      else if (change === 'step_down') beforeClose[key] = stepDown(state).state;
      else if (state.paused) beforeClose[key] = resumeAfterPain(state).state;
    }
    let character = held.bonus.reduce((c, xp) => addStatXp(c, xp, 1), shown.character);
    // The ended day closes as the server will close it: the ladder sessions, then the XP the close pays.
    const closed = closeLadders(LIBRARY, beforeClose, {
      startsAt: last.startsAt,
      protected: today.protection !== null,
      quests: today.quests.map((q) => ({ ladder: q.ladder, rung: q.rung, done: q.completedAt !== null, rating: q.rating })),
    }, rulesProfile(shown.profile, character));
    let ladders: Record<string, LadderState> = { ...beforeClose, ...closed.changed };
    if (next.comeback) ladders = { ...ladders, ...reenterLadders(ladders, next.window.startsAt, last.endsAt) };
    const paid: XpByStat[] = [];
    if (today.quests.some((q) => q.slot === 'core' && q.completedAt !== null)) paid.push({ discipline: DISCIPLINE_PER_CORE_DAY });
    for (const { ladder } of closed.newRungs) {
      const bonus: XpByStat = {};
      bonus[ladderById(LIBRARY, ladder).stat] = RUNG_BONUS_XP;
      paid.push(bonus);
    }
    character = paid.reduce((c, xp) => addStatXp(c, xp, 1), character);
    const ended: PastDay = { dayNumber: today.dayNumber, quests: Object.fromEntries(today.quests.map((q) => [q.slot, q.templateId])) };
    const history = [...held.history.filter((d) => d.dayNumber !== today.dayNumber), ended]
      .sort((a, b) => a.dayNumber - b.dayNumber)
      .slice(-7);
    const workoutsDone = Math.max(0, held.workoutsDone + sessionsDone(today) - sessionsDone(baseline));
    // M16: the run as of the new day's start, as the server finds it (rules: programRun): the weekly workouts done, and
    // none after 14 days without one. A state cached before M16 has neither: its player is on the step-by-step plan.
    const doneHere = programDoneOn(today);
    const times = [held.programLastAt, ...doneHere.map((q) => q.completedAt)].flatMap((t) => (t === null ? [] : [Date.parse(t)]));
    const ran = times.length > 0 && next.window.startsAt - Math.max(...times) <= BLOCK_RESTART_MS;
    const programDone = ran ? Math.max(0, held.programDone + doneHere.length - programDoneOn(baseline).length) : 0;
    // A "sick" or "injured" answer asked for a light day (M7a decision 6): the server builds the same one, so it keeps it.
    const light = next.comeback || (first && shown.character.nextDayLight);
    const built = buildDay(LIBRARY, {
      dayNumber: next.dayNumber, profile: rulesProfile(shown.profile, character), ladders, history, light, workoutsDone, programDone,
      rest: shown.character.restDay === next.dayNumber, articleId: null,
    });
    return {
      event: {
        type: 'provisional_day',
        dayNumber: built.dayNumber,
        builtAt: nowMs,
        timeZone: next.window.timeZone,
        window: { startsAt: next.window.startsAt, endsAt: next.window.endsAt },
        budget: built.budget,
        light: built.light,
        // M8b decision 4: the article the server named for the next day; it keeps it while it is published.
        articleId: first ? (shown.nextArticle?.id ?? null) : null,
        quests: built.quests.map((q) => ({ slot: q.slot, templateId: q.templateId, why: q.why, moves: q.moves, book: q.book, block: q.block })),
      },
      held: {
        ladders, history, workoutsDone, programDone,
        programLastAt: times.length > 0 ? new Date(Math.max(...times)).toISOString() : null,
        bonus: [...held.bonus, ...paid],
      },
    };
  } catch {
    return null; // the rules can't build it from what the phone holds: "preparing", as before M6e
  }
}

/** The server's counts, or null for a state cached before M6e (decision 3). */
function serverHeld(server: ServerState): Held | null {
  const held = server as Partial<Pick<ServerState, 'ladders' | 'history' | 'workoutsDone' | 'programDone' | 'programLastAt'>>;
  if (held.ladders === undefined || held.history === undefined || held.workoutsDone === undefined) return null;
  return {
    ladders: held.ladders, history: held.history, workoutsDone: held.workoutsDone, programDone: held.programDone ?? 0,
    programLastAt: held.programLastAt ?? null, bonus: [],
  };
}

/**
 * The `provisional_day` for the day after the server's own day on screen, or null: it hasn't ended, an offline day is
 * already shown (see `nextOfflineDay`), the cached state is from before M6e (decision 3), or the rules can't build a day.
 */
export function offlineDay(server: ServerState, shown: Shown, nowMs: number, timeZone: string): Omit<ProvisionalDayEvent, 'id'> | null {
  const held = serverHeld(server);
  if (shown.offline || held === null) return null;
  return step(shown, held, server.today, true, shown.ladderChanges, nowMs, timeZone)?.event ?? null;
}

/**
 * Premium pass A6: the next day to build here, after the server's own day or after the days this phone already built
 * (M6e built one, then waited). Each built day is closed again as it was then (as of its `builtAt`), so the next one
 * starts from what its close leaves; the server, given the same days in the same order, closes and builds them alike,
 * and keeps the completions on a day it builds otherwise (M6e decision 7). Check-in answers wait, as in `offlineView`.
 * At most MAX_OFFLINE_DAYS.
 */
export function nextOfflineDay(server: ServerState, pending: readonly PhoneEvent[], nowMs: number, timeZone: string): Omit<ProvisionalDayEvent, 'id'> | null {
  const events = pending.filter((e) => e.type !== 'checkin');
  const built = events.flatMap((e, i) => (e.type === 'provisional_day' ? [i] : []));
  if (built.length === 0) return offlineDay(server, project(server, events), nowMs, timeZone);
  if (built.length >= MAX_OFFLINE_DAYS) return null;
  let held = serverHeld(server);
  let counted = 0; // the ladder changes already applied by an earlier close
  for (let k = 0; k < built.length && held !== null; k++) {
    const made = events[built[k]!] as ProvisionalDayEvent;
    const before = project(server, events.slice(0, built[k]));
    // Each built day is closed again as it was then: its own clock and time zone (review: not today's zone).
    held = step(before, held, k === 0 ? server.today : null, k === 0, before.ladderChanges.slice(counted), made.builtAt, made.timeZone)?.held ?? null;
    counted = before.ladderChanges.length;
  }
  if (held === null) return null;
  const shown = project(server, events);
  // The server's state already has the day built here (it arrived before its event left the outbox): build after it.
  if (!shown.offline) return offlineDay(server, shown, nowMs, timeZone);
  return step(shown, held, null, false, shown.ladderChanges.slice(counted), nowMs, timeZone)?.event ?? null;
}
