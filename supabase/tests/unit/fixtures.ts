// Rows as postgres.js returns them, built from the real library so the day builder sees real quests.
import { DAY_MS, draftQuest, isWorkout, nextDayWindow, planWorkout, specialTemplate, templateById } from '../../../packages/rules/src/index.ts';
import type { LadderState, Slot, WhyReason } from '../../../packages/rules/src/index.ts';
import { CONTENT_VERSION, LIBRARY } from '../../../packages/content/src/index.ts';
import { startArgs, templateReveal } from '../../functions/_shared/onboarding.ts';
import type { Choices } from '../../functions/_shared/onboarding.ts';
import type { AdvanceInput } from '../../functions/_shared/advance.ts';
import { toDraft } from '../../functions/_shared/drafts.ts';
import { startPoints, statXp, toProfile } from '../../functions/_shared/state.ts';
import type { CharacterRow, DayDraft, DayRow, History, InstanceDraft, InstanceRow, LadderRow, ProfileRow, Snapshot } from '../../functions/_shared/state.ts';

/** Onboarding at 8 PM in Manila on 10 October 2026; day 1 runs to 4 AM. */
export const ONBOARDED = Date.UTC(2026, 9, 10, 12, 0);
export const HOUR = 3_600_000;

export function choices(over: Partial<Choices> = {}): Choices {
  return {
    name: 'Rin', voice: 'system', goals: ['body', 'energy'], classId: 'warrior',
    estimates: { strength: 5, vitality: 5, wisdom: 5, focus: 5, discipline: 4 },
    training: 'some', reading: null, focus: null,
    minutesPerDay: 25, difficulty: 'steady', boundaryMinutes: 240, timeZone: 'Asia/Manila',
    limitations: [], gentleStart: false, ownProgram: false, equipment: [], programStyle: 'none', ...over,
  };
}

/** The body the phone sends for `choices()` (apps/mobile/src/onboarding/flow.ts). */
export function onboardingBody(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'Rin', voice: 'system', goals: ['body', 'energy'], training: 'some', reading: null, focus: null, limitations: [],
    safety: [false, false, false, false, false, false, false], minutesPerDay: 25, difficulty: 'steady', boundaryMinutes: 240,
    timeZone: 'Asia/Manila', ...over,
  };
}

export function profileRow(c: Choices = choices(), over: Partial<ProfileRow> = {}): ProfileRow {
  return {
    user_id: '00000000-0000-4000-8000-000000000001', name: c.name, voice: c.voice, class_id: c.classId, class_changed_at: null,
    time_zone: c.timeZone,
    boundary_minutes: c.boundaryMinutes, minutes_per_day: c.minutesPerDay, difficulty: c.difficulty, goals: c.goals,
    limitations: c.limitations, gentle_start: c.gentleStart, own_program: c.ownProgram, equipment: c.equipment,
    program_style: c.programStyle, book: null, book_started_at: null, books_finished: [], reveal: {}, accountability_level: 0, ...over,
  };
}

export function characterRow(over: Partial<CharacterRow> = {}): CharacterRow {
  return {
    start_strength: 7, start_vitality: 5, start_wisdom: 5, start_focus: 5, start_discipline: 4,
    xp_strength: 0, xp_vitality: 0, xp_wisdom: 0, xp_focus: 0, xp_discipline: 0, total_xp: 0,
    streak_current: 0, streak_best: 0, shields: 0, awaiting_checkin: false,
    quests_cleared: 0, hard_days_cleared: 0, comebacks: 0, recoveries_cleared: 0, articles_read: 0,
    ability_last_used: {}, version: 1, ...over,
  };
}

export function dayRow(draft: DayDraft, id: number, over: Partial<DayRow> = {}): DayRow {
  return {
    id: String(id), day_number: draft.dayNumber, starts_at: new Date(draft.startsAt), ends_at: new Date(draft.endsAt),
    time_zone: draft.timeZone, budget: draft.budget, light: draft.light, comeback: draft.comeback, hard_day: false,
    article_id: null, protection: draft.protection, status: 'open', resolution: null, streak_applied: false, swaps_used: 0, ...over,
  };
}

/** The day's quests as rows; `done` slots are completed (rated `rating`). */
export function instanceRows(draft: DayDraft, dayId: number, done: readonly Slot[] = [], rating: InstanceRow['rating'] = null): InstanceRow[] {
  return draft.quests.map((q, i) => ({
    id: String(dayId * 100 + i), day_id: String(dayId), slot: q.slot, template_id: q.templateId, ladder_id: q.ladder, rung: q.rung,
    stat: q.stat, tier: q.tier, minutes: q.minutes, completion: q.completion, condition: q.condition, hard_day: q.hardDay, xp: q.xp,
    why: q.why, book: q.book,
    completed_at: done.includes(q.slot) ? new Date(new Date(draft.startsAt).getTime() + HOUR) : null,
    rating: done.includes(q.slot) ? rating : null, payload: null,
  }));
}

export const DAY1: DayDraft = startArgs(choices(), templateReveal(choices()), ONBOARDED, LIBRARY).day;

/** Day 1 (onboarding) with `done` slots completed, seen at `nowMs`. */
export function afterDay1(done: readonly Slot[], nowMs: number, over: Partial<AdvanceInput> = {}): AdvanceInput {
  return {
    profile: profileRow(), character: characterRow(), ladders: [], days: [dayRow(DAY1, 1)], instances: instanceRows(DAY1, 1, done),
    queued: false, workoutsDone: 0, timeZone: 'Asia/Manila', nowMs, library: LIBRARY, contentVersion: CONTENT_VERSION, ...over,
  };
}

export function ladderRows(states: Record<string, LadderState>): LadderRow[] {
  return Object.entries(states).map(([ladder_id, state]) => ({ ladder_id, state }));
}

/** The n-th full day after day 1 in Manila (4 AM to 4 AM). */
export function manilaDay(n: number): { startsAt: number; endsAt: number } {
  let w = { startsAt: new Date(DAY1.startsAt).getTime(), endsAt: new Date(DAY1.endsAt).getTime(), timeZone: 'Asia/Manila' };
  for (let i = 1; i < n; i++) w = nextDayWindow(w, 'Asia/Manila', 240);
  return w;
}

/** The quests of `dayTwoSnapshot` by default: a strength ladder, a walk and a reading quest (23 of 25 minutes). */
export const DAY_TWO_SLOTS = { core: 'push-1', side1: 'walk-1', side2: 'reading-0' } as const;

/** A template drafted for the default player, a workout with its plan (program day 0). */
function drafted(templateId: string, slot: Slot, why: WhyReason): InstanceDraft {
  const template = templateById(LIBRARY, templateId);
  const player = toProfile(profileRow(), startPoints(characterRow()), statXp(characterRow()));
  const moves = isWorkout(template) ? planWorkout(LIBRARY.training, template, player, 0) : null;
  return toDraft(LIBRARY, draftQuest(template, slot, why, { moves }));
}

/**
 * The player on day 2 (a full 25-minute day in Manila, after a cleared day 1) with these templates in its slots, drafted
 * by the rules. Quest ids follow `instanceRows`: core 200, side1 201, side2 202, article 203. `day` changes day 2's row.
 */
export function dayTwoSnapshot(
  slots: { core: string; side1: string; side2: string } = DAY_TWO_SLOTS,
  over: Partial<Snapshot> = {},
  day: Partial<DayRow> = {},
): Snapshot {
  const w = manilaDay(2);
  const draft: DayDraft = {
    dayNumber: 2, startsAt: new Date(w.startsAt).toISOString(), endsAt: new Date(w.endsAt).toISOString(), timeZone: 'Asia/Manila',
    budget: 25, light: false, comeback: false, articleId: null, protection: null, contentVersion: CONTENT_VERSION,
    quests: [
      ...(['core', 'side1', 'side2'] as const).map((slot) => drafted(slots[slot], slot, { code: 'balance', stat: 'vitality' })),
      toDraft(LIBRARY, draftQuest(specialTemplate(LIBRARY, 'article'), 'article', { code: 'article' })),
    ],
  };
  return {
    profile: profileRow(),
    character: characterRow(),
    ladders: [],
    days: [dayRow(draft, 2, day), dayRow(DAY1, 1, { status: 'closed', resolution: 'streak_day', streak_applied: true })],
    instances: [...instanceRows(DAY1, 1, ['core']), ...instanceRows(draft, 2)],
    checkins: [],
    earned: [],
    queued: false,
    painReports: 0,
    workoutsDone: 0,
    ...over,
  };
}

/** The history `loadHistory` would read for a snapshot: its days, day 1, no rungs, nothing read. */
export function historyOf(s: Snapshot): History {
  const days = [...s.days].sort((a, b) => b.day_number - a.day_number);
  const one = days.find((d) => d.day_number === 1);
  return { days, dayOne: one === undefined ? null : one, newRungs: 0, reading: { sessions: 0, minutes: 0 } };
}

export { DAY_MS };
