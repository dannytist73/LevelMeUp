// The Accountability Pact (spec §4.3; M7c decisions 2–8): what "I just didn't" sets off under it, and the player's own
// changes (the level, the Trial's focus session, the private note). Pure: the rules decide (`decideConsequence`), and
// anything they can't decide is no consequence.
import { ACCOUNTABILITY_LEVELS, decideConsequence } from '../../../packages/rules/src/index.ts';
import type { AccountabilityLevel } from '../../../packages/rules/src/index.ts';
import type { AdjustCode, Change, Plan } from './adjust.ts';
import type { NoteEvent, PactEvent, TrialEvent } from './events.ts';
import type { Consequence, PendingCheckin, Snapshot } from './state.ts';
import { openDay } from './today.ts';

const refuse = (code: AdjustCode): Plan => ({ code });

/** The pact's level as the rules take it; anything else is no pact (bad data never leads to a consequence). */
export function pactLevel(level: number): AccountabilityLevel {
  return (ACCOUNTABILITY_LEVELS as readonly number[]).includes(level) ? (level as AccountabilityLevel) : 0;
}

/**
 * What the pact does with "I just didn't" on this check-in, answered on the running day `dayId` (decision 4): the Shadow
 * (level 1), the Trial (level 2), paused (3 in the last 7 days), or null. Lifted and paused ones don't count towards the
 * pause; one a day.
 */
export function consequenceFor(s: Snapshot, pending: PendingCheckin, dayId: number, nowMs: number): Consequence | null {
  const missedStart = pending.missed_starts_at ?? pending.gap_starts_at;
  if (missedStart === null) return null;
  const applied = s.answered.filter((a) => a.consequence === 'shadow' || a.consequence === 'trial');
  try {
    const decision = decideConsequence({
      pact: { level: pactLevel(s.profile.accountability_level), appliesFrom: s.profile.accountability_enabled_at?.getTime() ?? null },
      answer: 'just_didnt',
      missedDayStartsAt: missedStart.getTime(),
      consequenceTimes: applied.map((a) => a.answered_at.getTime()),
      nowMs,
      consequenceAlreadyOnThisQuestDay: applied.some((a) => String(a.recovery_day_id) === String(dayId)),
    });
    if (decision.kind === 'paused') return 'paused';
    if (decision.kind === 'apply') return decision.level === 2 ? 'trial' : 'shadow';
    return null;
  } catch {
    return null;
  }
}

/** The pact's level (decision 3). A lowering eases today's consequence at once; a raise never touches today's. */
export function planPact(s: Snapshot, event: PactEvent): Plan {
  const current = pactLevel(s.profile.accountability_level);
  if (event.level === current) return refuse('same_level');
  const change: Change = { pact: { level: event.level } };
  const held = s.checkin;
  if (event.level < current && held !== null && held.answer === 'just_didnt') {
    const checkinId = Number(held.id);
    if (held.consequence === 'trial') change.consequence = { checkinId, kind: event.level === 1 ? 'shadow' : null };
    else if (held.consequence === 'shadow' && event.level === 0) change.consequence = { checkinId, kind: null };
  }
  return { change };
}

/** The Trial's focus session, done (decision 7): once, on the recovery day while it runs. */
export function planTrial(s: Snapshot, event: TrialEvent, nowMs: number): Plan {
  const held = s.checkin;
  if (held === null || Number(held.id) !== event.checkinId || held.consequence !== 'trial') return refuse('no_trial');
  if (held.trial_done_at !== null) return refuse('trial_done');
  const day = openDay(s);
  if (day === null || String(day.id) !== String(held.recovery_day_id) || nowMs >= day.ends_at.getTime()) return refuse('day_closed');
  return { change: { day: { id: Number(day.id) }, trial: { checkinId: event.checkinId } } };
}

/** The private note (decision 8), on the check-in being held or one answered in the last 14 days. */
export function planNote(s: Snapshot, event: NoteEvent): Plan {
  const held = s.checkin !== null && s.checkin.answer !== null && Number(s.checkin.id) === event.checkinId;
  if (!held && !s.answered.some((a) => Number(a.id) === event.checkinId)) return refuse('checkin_gone');
  return { change: { note: { checkinId: event.checkinId, text: event.note } } };
}
