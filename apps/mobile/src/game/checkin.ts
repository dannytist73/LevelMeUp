// The check-in's words for this player (M7a, board F1): which day it asks about, what each answer does here, how a settled
// miss ended, and the streak's note. Pure.
import { CHECKIN_TEXT, fillText } from '@levelmeup/content';
import { dateKeyLabel } from '../lib/dates.ts';
import type { Shown } from './project.ts';
import type { CheckinView, LighterView, MissOutcome } from './types.ts';

const T = CHECKIN_TEXT;

/** The five answers on the board, in order; "sick or injured" asks which afterwards. */
export type CheckinChoice = keyof typeof CHECKIN_TEXT.answers;
export const CHECKIN_CHOICES: readonly CheckinChoice[] = ['sick_or_injured', 'emergency', 'too_hard', 'lighter_load', 'just_didnt'];

/** "Yesterday's core quest wasn't cleared…", the day's date, or the away days. `today` is the running day's number. */
export function checkinLead(c: CheckinView, today: number | null): string {
  if (c.gap) {
    const days = c.to - c.from + 1;
    return days === 1 ? T.leadGapOne : fillText(T.leadGap, { days });
  }
  if (today !== null && c.from === today - 1) return T.leadYesterday;
  return c.date === null ? T.leadYesterday : fillText(T.lead, { day: dateKeyLabel(c.date) });
}

/** The line under an answer: what it does here ("Streak paused" when the day has no ladder, or the minutes can't drop). */
export function answerLine(choice: CheckinChoice, c: CheckinView, lighter: LighterView): string {
  if (choice === 'too_hard' && c.ladder === null) return T.pausedOnly;
  if (choice === 'lighter_load' && lighter === null) return T.pausedOnly;
  return T.answers[choice].outcome;
}

/** How a settled "I just didn't" ended (decision 4). */
export function resultText(outcome: MissOutcome, best: number): string {
  return outcome === 'reset' ? fillText(T.result.reset, { best }) : T.result[outcome];
}

/** "paused" while a check-in waits, "held today" after "I just didn't", else null. */
export function streakNote(view: Pick<Shown, 'checkin' | 'character'>): string | null {
  if (view.checkin?.answer === 'just_didnt') return T.streakHeld;
  return view.character.streak.awaitingCheckin ? T.streakPaused : null;
}
