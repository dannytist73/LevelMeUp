// The Accountability Pact on the phone (M7c, boards F2–F5): the level's name, whether it is in force yet, and what the
// Shadow holds on the running day: the scene to show once, the mark, the seal on the side quests. Pure. The server
// decides every consequence and the phone shows it (decision 4); the seal is the phone's own (decision 6).
import { PACT_TEXT } from '@levelmeup/content';
import { ACCOUNTABILITY_LEVELS, isSealed } from '@levelmeup/rules';
import type { AccountabilityLevel, ActiveConsequence } from '@levelmeup/rules';
import type { Shown } from './project.ts';
import type { QuestView } from './types.ts';

/** A level the rules know; anything else is off. */
export function asLevel(n: number): AccountabilityLevel {
  return (ACCOUNTABILITY_LEVELS as readonly number[]).includes(n) ? (n as AccountabilityLevel) : 0;
}

/** "Off", "The Shadow · level 1" or "Trial of Stillness · level 2". */
export const pactName = (level: number): string => PACT_TEXT.names[asLevel(level)];

/**
 * The pact covers only days that start after it was signed (decision 2): true while today began before that, and while a
 * raise is on its way (the server signs it when it arrives).
 */
export function pactStartsNext(view: Pick<Shown, 'profile' | 'today'>): boolean {
  if (asLevel(view.profile.accountabilityLevel) === 0) return false;
  const from = view.profile.accountabilityFrom;
  if (from === null || view.today === null) return true;
  return Date.parse(from) > Date.parse(view.today.startsAt!);
}

/** What the Shadow holds on the running day after "I just didn't" (decisions 5–7). */
export type ShadowHold = {
  checkinId: number;
  kind: 'shadow' | 'trial' | 'paused';
  /** The recovery quest on today, once the server has added it. */
  recovery: QuestView | null;
  /** The recovery quest is cleared: the mark is gone and the day is taken back. */
  cleared: boolean;
  /** Level 2 before its focus session: the side quests are sealed (rules: isSealed). */
  sealed: boolean;
  note: string | null;
};

/** The Shadow's hold on today, or null: none, or one for a day that has ended (a day built offline is another day). */
export function shadowHold(view: Pick<Shown, 'checkin' | 'today'>, nowMs: number): ShadowHold | null {
  const c = view.checkin;
  const today = view.today;
  if (c === null || c.answer !== 'just_didnt' || c.consequence === null || today === null) return null;
  const endsAt = Date.parse(today.endsAt!);
  if (c.recoveryDayId !== today.id || nowMs >= endsAt) return null;
  const recovery = today.quests.find((q) => q.slot === 'recovery') ?? null;
  const active: ActiveConsequence | null = c.consequence === 'paused'
    ? null
    : { level: c.consequence === 'trial' ? 2 : 1, trialCleared: c.trialDone, dayStartsAt: Date.parse(today.startsAt!), dayEndsAt: endsAt };
  return {
    checkinId: c.id,
    kind: c.consequence,
    recovery,
    cleared: recovery !== null && recovery.completedAt !== null,
    sealed: isSealed('side1', active, nowMs),
    note: c.note,
  };
}

/** The Shadow's mark stays on Today's header and the portrait until the recovery quest is cleared (decision 9). */
export const marked = (hold: ShadowHold | null): boolean => hold !== null && hold.kind !== 'paused' && !hold.cleared;

/** A side quest the Trial seals now: never the core quest, the recovery quest or the reading, never a cleared one. */
export function sealedQuest(hold: ShadowHold | null, quest: Pick<QuestView, 'slot' | 'completedAt'>): boolean {
  return hold !== null && hold.sealed && quest.completedAt === null && (quest.slot === 'side1' || quest.slot === 'side2');
}

/** The check-in whose scene Today should open (decision 5), or null when there is none or it was shown. */
export function shadowDue(view: Pick<Shown, 'checkin' | 'today'>, seen: number | null, nowMs: number): number | null {
  const hold = shadowHold(view, nowMs);
  return hold !== null && hold.checkinId !== seen ? hold.checkinId : null;
}
