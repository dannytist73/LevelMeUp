// Adjusting the day (spec §2.5, §3.3–3.5; M6b decisions 1–10): one phone event becomes the change `levelmeup.adjust`
// writes (migration 0008), or the reason it is refused. Pure: the rules decide, from the same snapshot the offers come
// from (today.ts), and every reward in a replaced quest is drafted here, never taken from the phone.
import {
  abilityUnlocked, applyDawnRitual, applyHardDay, applyStillness, classChangeOpensAt, draftQuest, findTemplate, isWorkout, ladderById,
  newLadder, painKey, painOption, planWorkout, plannedMoves, recordPain, restAllowed, resumeAfterPain, stepDown, swapLimit, swapOptions,
} from '../../../packages/rules/src/index.ts';
import type { BuiltDay, ClassId, Equipment, LadderState, ProgramStyle, QuestDraft, QuestLibrary } from '../../../packages/rules/src/index.ts';
import { toDraft } from './drafts.ts';
import type { AdjustEvent, DayAbility, PainChoice } from './events.ts';
import { ladderMap, startPoints, statXp, toProfile } from './state.ts';
import type { DayRow, InstanceDraft, InstanceRow, Snapshot } from './state.ts';
import { QUEST_SLOTS, canStepDown, completedSlots, openDay, questsOf, restDays, todayBuilt, todayInput } from './today.ts';

/** Every reason an adjustment is refused; the phone has words for each (apps/mobile/src/game/notices.ts). */
export const ADJUST_CODES = [
  'not_found', 'day_closed', 'already_completed', 'not_swappable', 'no_swaps_left', 'not_an_option', 'already_hard_day',
  'already_protected', 'rest_limit', 'not_exercise', 'not_paused', 'not_too_hard', 'not_current',
  'same_class', 'class_locked', 'ability_not_ready', 'already_applied', 'bad_change', 'no_book', 'same_book',
] as const;
export type AdjustCode = (typeof ADJUST_CODES)[number];

/** A quest replaced in place: the instance id and everything the rules drafted for its slot. */
export type QuestChange = InstanceDraft & { id: number };

/** What `levelmeup.adjust` writes. */
export type Change = {
  day?: { id: number; hardDay?: true; protection?: 'planned_rest' | 'pain'; swaps?: 1 };
  quests?: QuestChange[];
  ladders?: Record<string, LadderState>;
  classId?: ClassId;
  ability?: { id: DayAbility; day: number };
  training?: { equipment: Equipment[]; programStyle: ProgramStyle };
  /** M6d: Scholar's Path (decision 12). */
  book?: { title: string | null; finished: boolean };
};

export type Plan = { change: Change } | { code: AdjustCode };
type Found<T> = T | { code: AdjustCode };

const refuse = (code: AdjustCode): Plan => ({ code });
const replace = (library: QuestLibrary, quest: InstanceRow, draft: QuestDraft): QuestChange => ({ id: Number(quest.id), ...toDraft(library, draft) });

/** The open day with this id, while it runs (the server closes ended days only after the events). */
function dayOf(s: Snapshot, dayId: number, nowMs: number): Found<DayRow> {
  const day = s.days.find((d) => Number(d.id) === dayId);
  if (day === undefined) return { code: 'not_found' };
  const open = openDay(s);
  if (open === null || String(open.id) !== String(day.id) || nowMs >= day.ends_at.getTime()) return { code: 'day_closed' };
  return day;
}

/** A quest of the running day. */
function questOf(s: Snapshot, instanceId: number, nowMs: number): Found<{ day: DayRow; quest: InstanceRow; quests: InstanceRow[] }> {
  const quest = s.instances.find((q) => Number(q.id) === instanceId);
  if (quest === undefined) return { code: 'not_found' };
  const day = dayOf(s, Number(quest.day_id), nowMs);
  if ('code' in day) return day;
  return { day, quest, quests: questsOf(s, day) };
}

export function planAdjust(s: Snapshot, event: AdjustEvent, ctx: { nowMs: number; library: QuestLibrary }): Plan {
  try {
    return plan(s, event, ctx);
  } catch (error) {
    // The rules refuse what they can't build from (RangeError), e.g. a template this version no longer knows.
    if (error instanceof RangeError) return refuse('bad_change');
    throw error;
  }
}

function plan(s: Snapshot, event: AdjustEvent, { nowMs, library }: { nowMs: number; library: QuestLibrary }): Plan {
  switch (event.type) {
    case 'swap': {
      const found = questOf(s, event.instanceId, nowMs);
      if ('code' in found) return found;
      const { day, quest, quests } = found;
      if (quest.completed_at !== null) return refuse('already_completed');
      if (!QUEST_SLOTS.includes(quest.slot)) return refuse('not_swappable');
      const input = todayInput(s, day);
      if (swapLimit(input.profile.classId, input.profile.level) <= day.swaps_used) return refuse('no_swaps_left');
      const option = swapOptions(library, input, todayBuilt(day, quests), quest.slot).find((q) => q.templateId === event.templateId);
      if (option === undefined) return refuse('not_an_option');
      return { change: { day: { id: Number(day.id), swaps: 1 }, quests: [replace(library, quest, option)] } };
    }
    case 'hard_day': {
      const day = dayOf(s, event.dayId, nowMs);
      if ('code' in day) return day;
      if (day.hard_day) return refuse('already_hard_day');
      const quests = questsOf(s, day);
      const hard = applyHardDay(library, todayBuilt(day, quests), completedSlots(quests));
      const open = quests.filter((q) => q.completed_at === null && QUEST_SLOTS.includes(q.slot));
      return {
        change: {
          day: { id: Number(day.id), hardDay: true },
          quests: open.map((q) => replace(library, q, hard.quests.find((h) => h.slot === q.slot)!)),
        },
      };
    }
    case 'plan_rest': {
      const day = dayOf(s, event.dayId, nowMs);
      if ('code' in day) return day;
      if (day.protection !== null) return refuse('already_protected');
      if (!restAllowed(restDays(s.days), day.day_number)) return refuse('rest_limit');
      return { change: { day: { id: Number(day.id), protection: 'planned_rest' } } };
    }
    case 'pain': {
      // A valid report always rests the exercise (M6b review): even when it syncs after its day ended, or after the quest
      // was cleared. Only the day itself can no longer change then.
      const quest = s.instances.find((q) => Number(q.id) === event.instanceId);
      if (quest === undefined) return refuse('not_found');
      const template = findTemplate(library, quest.template_id);
      if (template === undefined || template.exercise === null) return refuse('not_exercise');
      const key = painKey(template);
      const ladders = { [key]: recordPain(ladderMap(s.ladders)[key] ?? newLadder()).state };
      const day = dayOf(s, Number(quest.day_id), nowMs);
      if ('code' in day || event.choice === 'pause') return { change: { ladders } };
      const rest: Plan = { change: day.protection === null ? { ladders, day: { id: Number(day.id), protection: 'pain' } } : { ladders } };
      if (event.choice === 'rest') return rest;
      if (quest.completed_at !== null) return { change: { ladders } };
      let option: QuestDraft | null;
      try {
        option = painOption(library, todayInput(s, day), todayBuilt(day, questsOf(s, day)), quest.slot);
      } catch (error) {
        // The rules can't read the day (a template this version doesn't know): the report still rests (re-review).
        if (!(error instanceof RangeError)) throw error;
        option = null;
      }
      // Nothing gentle fits any more (the day changed since the offer): rest is always the other way.
      if (option === null) return rest;
      return { change: { ladders, day: { id: Number(day.id) }, quests: [replace(library, quest, option)] } };
    }
    case 'resume': {
      const state = ladderMap(s.ladders)[event.ladderId];
      if (state === undefined || !state.paused) return refuse('not_paused');
      return { change: { ladders: { [event.ladderId]: resumeAfterPain(state).state } } };
    }
    case 'step_down': {
      const found = questOf(s, event.instanceId, nowMs);
      if ('code' in found) return found;
      const { quest } = found;
      if (quest.completed_at === null || quest.rating !== 'too_hard') return refuse('not_too_hard');
      if (!canStepDown(s, quest)) return refuse('not_current');
      const ladder = quest.ladder_id!;
      return { change: { ladders: { [ladder]: stepDown(ladderMap(s.ladders)[ladder] ?? newLadder()).state } } };
    }
    case 'class_change': {
      if (event.classId === s.profile.class_id) return refuse('same_class');
      if (classChangeOpensAt(s.profile.class_changed_at?.getTime() ?? null, nowMs) !== null) return refuse('class_locked');
      return { change: { classId: event.classId } };
    }
    case 'ability': {
      const day = dayOf(s, event.dayId, nowMs);
      if ('code' in day) return day;
      const quests = questsOf(s, day);
      const core = quests.find((q) => q.slot === 'core');
      if (core === undefined) return refuse('ability_not_ready');
      if (core.completed_at !== null) return refuse('already_completed');
      if (findTemplate(library, core.template_id)?.role === event.ability) return refuse('already_applied');
      const input = todayInput(s, day);
      const built = todayBuilt(day, quests);
      const done = completedSlots(quests);
      let next: BuiltDay;
      try {
        next = event.ability === 'stillness'
          ? applyStillness(library, input, built, { lastUsedDay: s.character.ability_last_used.stillness ?? null, completedSlots: done })
          : applyDawnRitual(library, input, built, done);
      } catch (error) {
        if (error instanceof RangeError) return refuse('ability_not_ready');
        throw error;
      }
      return {
        change: {
          day: { id: Number(day.id) },
          quests: [replace(library, core, next.quests.find((q) => q.slot === 'core')!)],
          ability: { id: event.ability, day: day.day_number },
        },
      };
    }
    case 'training': {
      // The setup always changes; today's open workouts are re-planned with it, same rung and reward (decision 12).
      const training = { equipment: event.equipment, programStyle: event.programStyle };
      const day = openDay(s);
      if (day === null || nowMs >= day.ends_at.getTime()) return { change: { training } };
      const input = todayInput(s, day);
      const player = { ...input.profile, ...training };
      const quests: QuestChange[] = [];
      for (const q of questsOf(s, day)) {
        if (q.completed_at !== null || !QUEST_SLOTS.includes(q.slot)) continue;
        const template = findTemplate(library, q.template_id);
        if (template === undefined || !isWorkout(template)) continue;
        const moves = planWorkout(library.training, template, player, input.workoutsDone);
        if (moves === null) continue; // too few exercises fit the new setup: today's plan stays
        quests.push(replace(library, q, draftQuest(template, q.slot, q.why, { hardDay: q.hard_day, book: q.book, moves })));
      }
      return { change: quests.length === 0 ? { training } : { training, day: { id: Number(day.id) }, quests } };
    }
    case 'book': {
      const player = toProfile(s.profile, startPoints(s.character), statXp(s.character));
      if (!abilityUnlocked('scholars_path', player.classId, player.level)) return refuse('ability_not_ready');
      if ((event.finished || event.title === null) && s.profile.book === null) return refuse('no_book');
      if (!event.finished && event.title === s.profile.book) return refuse('same_book');
      const book = { title: event.title, finished: event.finished };
      const day = openDay(s);
      if (day === null || nowMs >= day.ends_at.getTime()) return { change: { book } };
      // Today's open reading quests show the new book at once (as `training` re-plans today's workout).
      const quests: QuestChange[] = [];
      for (const q of questsOf(s, day)) {
        if (q.completed_at !== null || !QUEST_SLOTS.includes(q.slot)) continue;
        const template = findTemplate(library, q.template_id);
        if (template === undefined || template.ladder === null || !ladderById(library, template.ladder).tracksBook) continue;
        quests.push(replace(library, q, draftQuest(template, q.slot, q.why, { hardDay: q.hard_day, book: event.title, moves: plannedMoves(q.condition) })));
      }
      return { change: quests.length === 0 ? { book } : { book, day: { id: Number(day.id) }, quests } };
    }
  }
}

/**
 * "I felt pain" about a quest of a day the phone built offline that the server rebuilt (M6e review): the exercise the
 * player did rests, and "rest" still protects the day while it runs, as on any day (gentle movement was never offered
 * there, so it rests too). The day's quests stay as they are.
 */
export function planOfflinePain(
  s: Snapshot,
  pain: { dayNumber: number; templateId: string; choice: PainChoice },
  ctx: { nowMs: number; library: QuestLibrary },
): Plan {
  const template = findTemplate(ctx.library, pain.templateId);
  if (template === undefined || template.exercise === null) return refuse('not_exercise');
  const key = painKey(template);
  const ladders = { [key]: recordPain(ladderMap(s.ladders)[key] ?? newLadder()).state };
  const stored = s.days.find((d) => d.day_number === pain.dayNumber);
  const day = stored === undefined ? null : dayOf(s, Number(stored.id), ctx.nowMs);
  if (pain.choice === 'pause' || day === null || 'code' in day || day.protection !== null) return { change: { ladders } };
  return { change: { ladders, day: { id: Number(day.id), protection: 'pain' } } };
}
