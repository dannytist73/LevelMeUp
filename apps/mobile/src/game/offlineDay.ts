// The next quest day, built on the phone when the day on screen has ended and the server can't be reached (M6e,
// architecture §6). It closes the ended day the way the server does (rules: closing.ts) with what the phone shows, then
// builds with the same rules (`buildDay`); the server checks it when it syncs (`checkProvisionalDay`).
import { LIBRARY } from '@levelmeup/content';
import {
  BLOCK_RESTART_MS, DISCIPLINE_PER_CORE_DAY, RUNG_BONUS_XP, TRAINABLE_STATS, buildDay, closeLadders, followingDay, ladderById, newLadder,
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
 * The `provisional_day` for the day after the one on screen, or null: it hasn't ended, an offline day is already shown
 * (one at a time, decision 1), the cached state is from before M6e (decision 3), or the rules can't build a day.
 */
export function offlineDay(server: ServerState, shown: Shown, nowMs: number, timeZone: string): Omit<ProvisionalDayEvent, 'id'> | null {
  const today = shown.today;
  if (shown.offline || today === null || today.startsAt === null || today.endsAt === null) return null;
  const last = { startsAt: Date.parse(today.startsAt), endsAt: Date.parse(today.endsAt), timeZone: today.timeZone };
  if (last.endsAt > nowMs) return null;
  const held = server as Partial<Pick<ServerState, 'ladders' | 'history' | 'workoutsDone' | 'programDone' | 'programLastAt'>>;
  if (held.ladders === undefined || held.history === undefined || held.workoutsDone === undefined) return null;
  try {
    const next = followingDay(last, today.dayNumber, timeZone, shown.profile.boundaryMinutes, nowMs);
    // Changes still on their way come first, as the server applies events before it closes a day (review): "I felt
    // pain" rests an exercise, Resume brings it back a rung easier, a step-down lowers its ladder.
    const beforeClose: Record<string, LadderState> = { ...held.ladders };
    for (const { key, change } of shown.ladderChanges) {
      const state = beforeClose[key] ?? newLadder();
      if (change === 'pain') beforeClose[key] = recordPain(state).state;
      else if (change === 'step_down') beforeClose[key] = stepDown(state).state;
      else if (state.paused) beforeClose[key] = resumeAfterPain(state).state;
    }
    // The ended day closes as the server will close it: the ladder sessions, then the XP the close pays.
    const closed = closeLadders(LIBRARY, beforeClose, {
      startsAt: last.startsAt,
      protected: today.protection !== null,
      quests: today.quests.map((q) => ({ ladder: q.ladder, rung: q.rung, done: q.completedAt !== null, rating: q.rating })),
    }, rulesProfile(shown.profile, shown.character));
    let ladders: Record<string, LadderState> = { ...beforeClose, ...closed.changed };
    if (next.comeback) ladders = { ...ladders, ...reenterLadders(ladders, next.window.startsAt, last.endsAt) };
    let character = shown.character;
    if (today.quests.some((q) => q.slot === 'core' && q.completedAt !== null)) {
      character = addStatXp(character, { discipline: DISCIPLINE_PER_CORE_DAY }, 1);
    }
    for (const { ladder } of closed.newRungs) {
      const bonus: XpByStat = {};
      bonus[ladderById(LIBRARY, ladder).stat] = RUNG_BONUS_XP;
      character = addStatXp(character, bonus, 1);
    }
    const ended: PastDay = { dayNumber: today.dayNumber, quests: Object.fromEntries(today.quests.map((q) => [q.slot, q.templateId])) };
    const history = [...held.history.filter((d) => d.dayNumber !== today.dayNumber), ended]
      .sort((a, b) => a.dayNumber - b.dayNumber)
      .slice(-7);
    const workoutsDone = Math.max(0, held.workoutsDone + sessionsDone(today) - sessionsDone(server.today));
    // M16: the run as of the new day's start, as the server finds it (rules: programRun): the weekly workouts done, and
    // none after 14 days without one. A state cached before M16 has neither: its player is on the step-by-step plan.
    const doneHere = programDoneOn(today);
    const times = [held.programLastAt ?? null, ...doneHere.map((q) => q.completedAt)].flatMap((t) => (t === null ? [] : [Date.parse(t)]));
    const ran = times.length > 0 && next.window.startsAt - Math.max(...times) <= BLOCK_RESTART_MS;
    const programDone = ran ? Math.max(0, (held.programDone ?? 0) + doneHere.length - programDoneOn(server.today).length) : 0;
    // A "sick" or "injured" answer asked for a light day (M7a decision 6): the server builds the same one, so it keeps it.
    const light = next.comeback || shown.character.nextDayLight;
    const built = buildDay(LIBRARY, {
      dayNumber: next.dayNumber, profile: rulesProfile(shown.profile, character), ladders, history, light, workoutsDone, programDone,
      rest: shown.character.restDay === next.dayNumber, articleId: null,
    });
    return {
      type: 'provisional_day',
      dayNumber: built.dayNumber,
      builtAt: nowMs,
      timeZone: next.window.timeZone,
      window: { startsAt: next.window.startsAt, endsAt: next.window.endsAt },
      budget: built.budget,
      light: built.light,
      // M8b decision 4: the article the server named for the next day; it keeps it while it is published.
      articleId: shown.nextArticle?.id ?? null,
      quests: built.quests.map((q) => ({ slot: q.slot, templateId: q.templateId, why: q.why, moves: q.moves, book: q.book, block: q.block })),
    };
  } catch {
    return null; // the rules can't build it from what the phone holds: "preparing", as before M6e
  }
}
