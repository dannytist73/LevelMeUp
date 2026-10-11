// The next quest day, built on the phone when the day on screen has ended and the server can't be reached (M6e,
// architecture §6). It closes the ended day the way the server does (rules: closing.ts) with what the phone shows, then
// builds with the same rules (`buildDay`); the server checks it when it syncs (`checkProvisionalDay`).
import { LIBRARY } from '@levelmeup/content';
import {
  DISCIPLINE_PER_CORE_DAY, RUNG_BONUS_XP, TRAINABLE_STATS, buildDay, closeLadders, followingDay, ladderById, reenterLadders,
} from '@levelmeup/rules';
import type { LadderState, PastDay, PlayerProfile, TrainableStat, XpByStat } from '@levelmeup/rules';
import { addStatXp } from './project.ts';
import type { Shown } from './project.ts';
import type { CharacterView, ProvisionalDayEvent, ServerState, TodayView } from './types.ts';

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
    stats: Object.fromEntries(TRAINABLE_STATS.map((s) => [s, character.stats[s].points])) as Record<TrainableStat, number>,
    book: profile.book,
  };
}

const sessionsDone = (today: TodayView | null): number =>
  (today?.quests ?? []).filter((q) => q.condition.kind === 'session' && q.completedAt !== null).length;

/**
 * The `provisional_day` for the day after the one on screen, or null: it hasn't ended, an offline day is already shown
 * (one at a time, decision 1), the cached state is from before M6e (decision 3), or the rules can't build a day.
 */
export function offlineDay(server: ServerState, shown: Shown, nowMs: number, timeZone: string): Omit<ProvisionalDayEvent, 'id'> | null {
  const today = shown.today;
  if (shown.offline || today === null || today.startsAt === null || today.endsAt === null) return null;
  const last = { startsAt: Date.parse(today.startsAt), endsAt: Date.parse(today.endsAt), timeZone: today.timeZone };
  if (last.endsAt > nowMs) return null;
  const held = server as Partial<Pick<ServerState, 'ladders' | 'history' | 'workoutsDone'>>;
  if (held.ladders === undefined || held.history === undefined || held.workoutsDone === undefined) return null;
  try {
    const next = followingDay(last, today.dayNumber, timeZone, shown.profile.boundaryMinutes, nowMs);
    // The ended day closes as the server will close it: the ladder sessions, then the XP the close pays.
    const closed = closeLadders(LIBRARY, held.ladders, {
      startsAt: last.startsAt,
      protected: today.protection !== null,
      quests: today.quests.map((q) => ({ ladder: q.ladder, rung: q.rung, done: q.completedAt !== null, rating: q.rating })),
    }, rulesProfile(shown.profile, shown.character));
    let ladders: Record<string, LadderState> = { ...held.ladders, ...closed.changed };
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
    const built = buildDay(LIBRARY, {
      dayNumber: next.dayNumber, profile: rulesProfile(shown.profile, character), ladders, history, light: next.comeback, workoutsDone,
      articleId: null,
    });
    return {
      type: 'provisional_day',
      dayNumber: built.dayNumber,
      builtAt: nowMs,
      timeZone: next.window.timeZone,
      window: { startsAt: next.window.startsAt, endsAt: next.window.endsAt },
      budget: built.budget,
      light: built.light,
      quests: built.quests.map((q) => ({ slot: q.slot, templateId: q.templateId, why: q.why, moves: q.moves, book: q.book })),
    };
  } catch {
    return null; // the rules can't build it from what the phone holds: "preparing", as before M6e
  }
}
