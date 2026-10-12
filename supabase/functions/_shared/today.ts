// Today as the rules see it (M6b): the open day and its quests as a `DayInput` and a `BuiltDay`, and what the phone may
// offer on it. Pure. The planner (adjust.ts) and the state view use the same functions, so the phone is offered only
// what the server will accept.
import {
  abilityReady, abilityUnlocked, applyDawnRitual, applyStillness, findTemplate, newLadder, painOption, plannedMoves, restAllowed,
  secondWindRedo, swapLimit, swapOptions,
} from '../../../packages/rules/src/index.ts';
import type { BuiltDay, DayInput, QuestDraft, QuestLibrary, Slot } from '../../../packages/rules/src/index.ts';
import { toDraft } from './drafts.ts';
import { NO_OFFERS, ladderMap, pastDays, startPoints, statXp, toProfile } from './state.ts';
import type { DayOffers, DayRow, InstanceRow, QuestFields, Snapshot } from './state.ts';

/** The slots a player can change. */
export const QUEST_SLOTS: readonly Slot[] = ['core', 'side1', 'side2'];

/** The latest day, while it is open. */
export function openDay(s: Snapshot): DayRow | null {
  const latest = [...s.days].sort((a, b) => b.day_number - a.day_number)[0];
  return latest !== undefined && latest.status === 'open' ? latest : null;
}

export function questsOf(s: Snapshot, day: DayRow): InstanceRow[] {
  return s.instances.filter((q) => String(q.day_id) === String(day.id));
}

export const completedSlots = (quests: readonly InstanceRow[]): Slot[] => quests.filter((q) => q.completed_at !== null).map((q) => q.slot);

/** The rules' input for an existing day: the player as they are now, the ladders, the 7 days before it. */
export function todayInput(s: Snapshot, day: DayRow): DayInput {
  return {
    dayNumber: day.day_number,
    profile: toProfile(s.profile, startPoints(s.character), statXp(s.character)),
    ladders: ladderMap(s.ladders),
    history: pastDays(s.days.filter((d) => d.day_number < day.day_number), s.instances).slice(-7),
    light: day.light,
    workoutsDone: s.workoutsDone,
    articleId: day.article_id,
  };
}

/** The stored day as the rules built it. */
export function todayBuilt(day: DayRow, quests: readonly InstanceRow[]): BuiltDay {
  return {
    dayNumber: day.day_number,
    budget: day.budget,
    light: day.light,
    hardDay: day.hard_day,
    articleId: day.article_id,
    quests: quests.map((q): QuestDraft => ({
      slot: q.slot, templateId: q.template_id, ladder: q.ladder_id, rung: q.rung, stat: q.stat, tier: q.tier,
      minutes: q.minutes, hardDay: q.hard_day, xp: q.xp, why: q.why, book: q.book, moves: plannedMoves(q.condition),
    })),
  };
}

/** A drafted quest as an offer: its stored fields, without the slot. */
export function fieldsOf(library: QuestLibrary, draft: QuestDraft): QuestFields {
  const { slot: _slot, ...fields } = toDraft(library, draft);
  return fields;
}

/** Planned rest days: the stored days rested as planned and (M7b decision 5) tomorrow, when it is planned. */
export function restDays(s: Pick<Snapshot, 'days' | 'character'>): number[] {
  const rested = s.days.filter((d) => d.protection === 'planned_rest').map((d) => d.day_number);
  const latest = Math.max(0, ...s.days.map((d) => d.day_number));
  const planned = s.character.rest_day;
  // A plan for a day already built (or passed as an away day) is spent: that day has its own protection.
  return planned !== null && planned > latest ? [...rested, planned] : rested;
}

/** "Too hard" can step this quest's ladder down: it is at the ladder's current rung, above the first, not resting. */
export function canStepDown(s: Snapshot, q: InstanceRow): boolean {
  if (q.ladder_id === null || q.rung === null || q.rung === 0) return false;
  const state = ladderMap(s.ladders)[q.ladder_id] ?? newLadder();
  return !state.paused && state.rung === q.rung;
}

function abilityOffers(s: Snapshot, library: QuestLibrary, input: DayInput, built: BuiltDay, quests: InstanceRow[]): DayOffers['abilities'] {
  const core = quests.find((q) => q.slot === 'core');
  if (core === undefined || core.completed_at !== null) return [];
  const role = findTemplate(library, core.template_id)?.role;
  const { classId, level } = input.profile;
  const done = completedSlots(quests);
  const coreOf = (day: BuiltDay): QuestFields => fieldsOf(library, day.quests.find((q) => q.slot === 'core')!);
  const offers: DayOffers['abilities'] = [];
  const lastStillness = s.character.ability_last_used.stillness ?? null;
  if (role !== 'stillness' && abilityReady('stillness', classId, level, lastStillness, built.dayNumber)) {
    offers.push({ ability: 'stillness', quest: coreOf(applyStillness(library, input, built, { lastUsedDay: lastStillness, completedSlots: done })) });
  }
  if (role !== 'dawn_ritual' && abilityUnlocked('dawn_ritual', classId, level)) {
    offers.push({ ability: 'dawn_ritual', quest: coreOf(applyDawnRitual(library, input, built, done)) });
  }
  return offers;
}

/** M7a: the quest Second Wind would redo with "I just didn't" on the pending check-in (decision 7), or null. */
function secondWindOffer(s: Snapshot, library: QuestLibrary, input: DayInput, built: BuiltDay): QuestFields | null {
  const c = s.checkin;
  if (c === null || c.answer !== null || c.missed_core === null) return null;
  const redo = secondWindRedo(library, input, built, c.missed_core, s.character.ability_last_used.second_wind ?? null);
  return redo === null ? null : fieldsOf(library, redo);
}

/** What the phone may offer on the open day (decision 2); nothing once it has closed. */
export function dayOffers(s: Snapshot, library: QuestLibrary): DayOffers {
  const day = openDay(s);
  if (day === null) return NO_OFFERS;
  const quests = questsOf(s, day);
  const rests = restDays(s);
  const restAllowedToday = day.protection === null && restAllowed(rests, day.day_number);
  const restTomorrow = s.character.rest_day !== day.day_number + 1 && restAllowed(rests, day.day_number + 1);
  // A day without quests (protected `no_quests`), or with a template this version doesn't know, offers only rest.
  const whole = QUEST_SLOTS.every((slot) => quests.some((q) => q.slot === slot))
    && quests.every((q) => findTemplate(library, q.template_id) !== undefined);
  if (!whole) return { ...NO_OFFERS, restAllowed: restAllowedToday, restTomorrow };
  const input = todayInput(s, day);
  const built = todayBuilt(day, quests);
  const swapsLeft = Math.max(0, swapLimit(input.profile.classId, input.profile.level) - day.swaps_used);
  const swaps: Record<string, QuestFields[]> = {};
  const gentle: Record<string, QuestFields | null> = {};
  for (const q of quests) {
    if (q.completed_at !== null || !QUEST_SLOTS.includes(q.slot)) continue;
    swaps[String(q.id)] = swapsLeft > 0 ? swapOptions(library, input, built, q.slot).map((d) => fieldsOf(library, d)) : [];
    if (findTemplate(library, q.template_id)!.exercise !== null) {
      const option = painOption(library, input, built, q.slot);
      gentle[String(q.id)] = option === null ? null : fieldsOf(library, option);
    }
  }
  return {
    swapsLeft,
    restAllowed: restAllowedToday,
    restTomorrow,
    abilities: abilityOffers(s, library, input, built, quests),
    swaps,
    gentle,
    stepDown: quests.filter((q) => canStepDown(s, q)).map((q) => String(q.id)),
    secondWind: secondWindOffer(s, library, input, built),
  };
}
