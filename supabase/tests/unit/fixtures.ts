// Rows as postgres.js returns them, built from the real library so the day builder sees real quests.
import { DAY_MS, nextDayWindow } from '../../../packages/rules/src/index.ts';
import type { LadderState, Slot } from '../../../packages/rules/src/index.ts';
import { CONTENT_VERSION, LIBRARY } from '../../../packages/content/src/index.ts';
import { startArgs, templateReveal } from '../../functions/_shared/onboarding.ts';
import type { Choices } from '../../functions/_shared/onboarding.ts';
import type { AdvanceInput } from '../../functions/_shared/advance.ts';
import type { CharacterRow, DayDraft, DayRow, InstanceRow, LadderRow, ProfileRow } from '../../functions/_shared/state.ts';

/** Onboarding at 8 PM in Manila on 10 October 2026; day 1 runs to 4 AM. */
export const ONBOARDED = Date.UTC(2026, 9, 10, 12, 0);
export const HOUR = 3_600_000;

export function choices(over: Partial<Choices> = {}): Choices {
  return {
    name: 'Rin', voice: 'system', goals: ['body', 'energy'], classId: 'warrior',
    estimates: { strength: 5, vitality: 5, wisdom: 5, focus: 5, discipline: 4 },
    minutesPerDay: 25, difficulty: 'steady', boundaryMinutes: 240, timeZone: 'Asia/Manila',
    limitations: [], gentleStart: false, ownProgram: false, ...over,
  };
}

export function profileRow(c: Choices = choices(), over: Partial<ProfileRow> = {}): ProfileRow {
  return {
    user_id: '00000000-0000-4000-8000-000000000001', name: c.name, voice: c.voice, class_id: c.classId, time_zone: c.timeZone,
    boundary_minutes: c.boundaryMinutes, minutes_per_day: c.minutesPerDay, difficulty: c.difficulty, goals: c.goals,
    limitations: c.limitations, gentle_start: c.gentleStart, own_program: c.ownProgram, book: null, reveal: {}, accountability_level: 0, ...over,
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
    article_id: null, protection: draft.protection, status: 'open', resolution: null, streak_applied: false, ...over,
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
    queued: false, timeZone: 'Asia/Manila', nowMs, library: LIBRARY, contentVersion: CONTENT_VERSION, ...over,
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

export { DAY_MS };
