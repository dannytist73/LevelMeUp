import { abilityReady, abilityUnlocked } from './abilities.ts';
import {
  DISCIPLINE_PER_RECOVERY, MIN_SIDE_MINUTES, PAIN_PERSISTS_REPORTS, REST_DAYS_PER_WEEK, SWAP_SAME_STAT_CHOICES, WEEK_QUEST_DAYS,
} from './constants.ts';
import {
  balanceChoice, blockFor, bookFor, dayBudget, dayContext, draftQuest, keptOutBy, ladderCandidates, microCandidates, movesFor,
  programCandidate, useKey,
} from './day.ts';
import type { BuiltDay, DayInput, QuestDraft, WhyReason } from './day.ts';
import { newLadder } from './ladder.ts';
import {
  allowedTopRung, findTemplate, ladderAllowed, ladderById, ladderExercise, ladderRungs, specialTemplate, templateAllowed,
  templateById, validateProfile,
} from './library.ts';
import type { Exercise, QuestLibrary, QuestTemplate } from './library.ts';
import type { Slot } from './types.ts';
import { isProgram, isWorkout, planProgram, planWorkout, programBlockFor, sameMoves } from './workout.ts';
import type { PlannedMove } from './workout.ts';

const QUEST_SLOTS: readonly Slot[] = ['core', 'side1', 'side2'];

/**
 * The minutes a slot's quest may take: the budget less the other two quests'. A weekly workout takes the time it takes,
 * outside the daily minutes (M16), so beside one a side quest keeps its minimum, as buildDay gives it.
 */
function slotAllowance(library: QuestLibrary, day: BuiltDay, slot: Slot): number {
  const others = QUEST_SLOTS.filter((s) => s !== slot).map((s) => questIn(day, s));
  const programs = others.filter((q) => isProgram(templateById(library, q.templateId)));
  const minutes = others.reduce((sum, q) => sum + (programs.includes(q) ? q.minutes : templateById(library, q.templateId).minutes), 0);
  return programs.length > 0 ? Math.max(MIN_SIDE_MINUTES, day.budget - minutes) : day.budget - minutes;
}

function questIn(day: BuiltDay, slot: Slot): QuestDraft {
  const quest = day.quests.find((q) => q.slot === slot);
  if (!quest) throw new RangeError(`the day has no ${slot} quest`);
  return quest;
}

function assertOpen(slot: Slot, completedSlots: readonly Slot[]): void {
  if (completedSlots.includes(slot)) throw new RangeError(`the ${slot} quest is already completed`);
}

function replaced(day: BuiltDay, quest: QuestDraft): BuiltDay {
  return { ...day, quests: day.quests.map((q) => (q.slot === quest.slot ? quest : q)) };
}

/**
 * What a swap can turn a quest into (spec §3.5): up to 2 quests of the same stat and 1 balance quest, each fitting the
 * minutes the other two quests leave. Yesterday's strength ladders and the after-strength rule still apply, and the
 * recovery quest's ladder is never offered. Empty when nothing else fits.
 */
export function swapOptions(library: QuestLibrary, input: DayInput, day: BuiltDay, slot: Slot): QuestDraft[] {
  if (!QUEST_SLOTS.includes(slot)) throw new RangeError(`only the core and side quests can be swapped, not ${slot}`);
  const ctx = dayContext(library, input);
  const current = templateById(library, questIn(day, slot).templateId);
  const others = QUEST_SLOTS.filter((s) => s !== slot).map((s) => templateById(library, questIn(day, s).templateId));
  const allowance = slotAllowance(library, day, slot);
  const recovery = day.quests.find((q) => q.slot === 'recovery');
  const staying = [...others, ...(recovery ? [templateById(library, recovery.templateId)] : [])];
  // No movement twice in a day: what the rest of the day keeps out (M6c review).
  const keptOut = day.quests
    .filter((q) => q.slot !== slot && q.slot !== 'article')
    .flatMap((q) => keptOutBy(library, templateById(library, q.templateId), q.moves));
  const used = new Set([current, ...staying].map(useKey).concat(keptOut));
  const noStrength = slot === 'core' && ctx.afterStrength;
  const sameStat = noStrength && current.stat === 'strength'
    ? []
    : [
        ...ladderCandidates(ctx, library.ladders.filter((l) => l.stat === current.stat), allowance, used),
        ...microCandidates(ctx, current.stat, allowance, used),
      ].slice(0, SWAP_SAME_STAT_CHOICES);
  const balance = balanceChoice(
    ctx,
    allowance,
    new Set([...used, ...sameStat.map((c) => useKey(c.template))]),
    [current.stat, ...others.map((t) => t.stat)],
    { noStrength },
  );
  const candidates = balance ? [...sameStat, balance.candidate] : sameStat;
  return candidates.map((c) =>
    draftQuest(c.template, slot, { code: 'swap' }, {
      hardDay: day.hardDay, book: bookFor(ctx, c.template), moves: movesFor(ctx, c.template), block: blockFor(ctx, c.template),
    }));
}

/** Swaps an open core or side quest for one of `swapOptions`. The caller checks the day's swap limit (`swapLimit`). */
export function applySwap(
  library: QuestLibrary,
  input: DayInput,
  day: BuiltDay,
  slot: Slot,
  templateId: string,
  completedSlots: readonly Slot[],
): BuiltDay {
  assertOpen(slot, completedSlots);
  const option = swapOptions(library, input, day, slot).find((q) => q.templateId === templateId);
  if (!option) throw new RangeError(`${templateId} is not a swap option for the ${slot} quest`);
  return replaced(day, option);
}

/** Hard day (spec §3.5): every open core and side quest becomes its hard-day version, for half XP. Applies once. */
export function applyHardDay(library: QuestLibrary, day: BuiltDay, completedSlots: readonly Slot[]): BuiltDay {
  if (day.hardDay) return day;
  return {
    ...day,
    hardDay: true,
    quests: day.quests.map((q) =>
      QUEST_SLOTS.includes(q.slot) && !completedSlots.includes(q.slot)
        ? draftQuest(templateById(library, q.templateId), q.slot, q.why, { hardDay: true, book: q.book, moves: q.moves, block: q.block })
        : q,
    ),
  };
}

/** At most 2 planned rest days in any 7 consecutive quest days (spec §3.5). Rest protects the streak; nothing else. */
export function restAllowed(restDays: readonly number[], dayNumber: number): boolean {
  if (!Number.isInteger(dayNumber) || dayNumber < 1) throw new RangeError(`dayNumber must be an integer of at least 1, got ${dayNumber}`);
  const days = new Set([...restDays, dayNumber]);
  // Every 7-day window that contains the day.
  for (let start = dayNumber - WEEK_QUEST_DAYS + 1; start <= dayNumber; start++) {
    let count = 0;
    for (let d = start; d < start + WEEK_QUEST_DAYS; d++) if (days.has(d)) count++;
    if (count > REST_DAYS_PER_WEEK) return false;
  }
  return true;
}

/** Premium pass C1: the first quest day from `fromDay` on, not already a rest day, that the 2-in-7 limit allows a rest on. */
export function nextRestDay(restDays: readonly number[], fromDay: number): number {
  let day = Math.max(1, fromDay);
  while (restDays.includes(day) || !restAllowed(restDays, day)) day++;
  return day;
}

/** What "I felt pain" pauses (spec §3.3): the quest's ladder, or a standalone exercise quest by its own id. */
export function painKey(template: QuestTemplate): string {
  if (template.exercise === null) throw new RangeError(`${template.id} is not an exercise quest`);
  return useKey(template);
}

/**
 * "I felt pain" (spec §3.3, §3.4): gentle movement instead of an open core or side exercise quest. The first rung of a
 * walking or mobility ladder (another kind of movement first) that fits the slot, isn't in the day and isn't resting.
 * Its rung is at or below the player's, so it never moves a ladder. Null when none fits: rest is always the other offer.
 */
export function painOption(library: QuestLibrary, input: DayInput, day: BuiltDay, slot: Slot): QuestDraft | null {
  if (!QUEST_SLOTS.includes(slot)) return null;
  validateProfile(input.profile);
  const current = templateById(library, questIn(day, slot).templateId);
  if (current.exercise === null) throw new RangeError(`${current.id} is not an exercise quest`);
  const others = QUEST_SLOTS.filter((s) => s !== slot).map((s) => templateById(library, questIn(day, s).templateId));
  const allowance = slotAllowance(library, day, slot);
  const recovery = day.quests.find((q) => q.slot === 'recovery');
  const used = new Set([current, ...others, ...(recovery ? [templateById(library, recovery.templateId)] : [])].map(useKey));
  const kinds: Exercise[] = current.exercise === 'walk' ? ['mobility', 'walk'] : ['walk', 'mobility'];
  for (const kind of kinds) {
    for (const ladder of library.ladders) {
      if (ladderExercise(library, ladder.id) !== kind || used.has(ladder.id) || input.ladders[ladder.id]?.paused) continue;
      if (!ladderAllowed(ladder, input.profile)) continue;
      const first = ladderRungs(library, ladder.id)[0];
      if (first === undefined || first.minutes > allowance || !templateAllowed(first, input.profile)) continue;
      return draftQuest(first, slot, { code: 'pain' }, { hardDay: day.hardDay });
    }
  }
  return null;
}

/** Pain this often in 14 days (this report included): the app leads with "see a doctor or physiotherapist". */
export function seeProfessional(reportsInWindow: number): boolean {
  return reportsInWindow >= PAIN_PERSISTS_REPORTS;
}

/** Stillness (Monk level 5, every 7 quest days): a gentle restoration quest replaces the core; the day still counts. */
export function applyStillness(
  library: QuestLibrary,
  input: DayInput,
  day: BuiltDay,
  usage: { lastUsedDay: number | null; completedSlots: readonly Slot[] },
): BuiltDay {
  validateProfile(input.profile);
  const { classId, level } = input.profile;
  if (!abilityReady('stillness', classId, level, usage.lastUsedDay, day.dayNumber)) throw new RangeError('Stillness is not ready');
  assertOpen('core', usage.completedSlots);
  return replaced(day, draftQuest(specialTemplate(library, 'stillness'), 'core', { code: 'stillness' }, { hardDay: day.hardDay }));
}

/** Dawn Ritual (Monk level 10): the morning routine bundle counts as the core quest. */
export function applyDawnRitual(library: QuestLibrary, input: DayInput, day: BuiltDay, completedSlots: readonly Slot[]): BuiltDay {
  validateProfile(input.profile);
  const { classId, level } = input.profile;
  if (!abilityUnlocked('dawn_ritual', classId, level)) throw new RangeError('Dawn Ritual is not unlocked');
  assertOpen('core', completedSlots);
  return replaced(day, draftQuest(specialTemplate(library, 'dawn_ritual'), 'core', { code: 'dawn_ritual' }, { hardDay: day.hardDay }));
}

export type RecoveryOption = { kind: 'recovery' } | { kind: 'second_wind'; missedCore: string; lastUsedDay: number | null };

/**
 * Adds the recovery quest owed after "I just didn't" (spec §3.7): the class's 5-minute quest for Discipline, or with
 * Second Wind (Warrior level 5, every 7 quest days) yesterday's missed core quest again, for its full XP plus that
 * Discipline. The redo follows the ladder as it is today: a ladder paused for pain or closed to the player refuses,
 * and a missed rung above today's rung (after a step down or a new limitation) is redone at today's rung.
 */
export function addRecovery(library: QuestLibrary, input: DayInput, day: BuiltDay, option: RecoveryOption): BuiltDay {
  validateProfile(input.profile);
  if (day.quests.some((q) => q.slot === 'recovery')) throw new RangeError('the day already has a recovery quest');
  const { classId, level } = input.profile;
  if (option.kind === 'recovery') {
    const template = templateById(library, library.recovery[classId]);
    return { ...day, quests: [...day.quests, draftQuest(template, 'recovery', { code: 'recovery' })] };
  }
  if (!abilityReady('second_wind', classId, level, option.lastUsedDay, day.dayNumber)) throw new RangeError('Second Wind is not ready');
  const yesterday = input.history.find((past) => past.dayNumber === day.dayNumber - 1);
  if (yesterday?.quests.core !== option.missedCore) throw new RangeError(`${option.missedCore} was not yesterday's core quest`);
  let redo = templateById(library, option.missedCore);
  if (redo.role !== 'ladder' && redo.role !== 'micro') throw new RangeError(`${redo.id} can't be redone with Second Wind`);
  if (redo.ladder !== null) {
    const state = input.ladders[redo.ladder] ?? newLadder();
    const rung = Math.min(redo.rung ?? 0, state.rung, allowedTopRung(library, redo.ladder, input.profile));
    if (state.paused || rung < 0) throw new RangeError(`${redo.ladder} is not open to this player today`);
    redo = ladderRungs(library, redo.ladder)[rung]!;
  } else if (!templateAllowed(redo, input.profile)) {
    throw new RangeError(`${redo.id} is not allowed for this player`);
  }
  if (day.quests.some((q) => useKey(templateById(library, q.templateId)) === useKey(redo))) {
    throw new RangeError(`${useKey(redo)} is already in today's quests`);
  }
  // A missed workout is redone with today's plan; one that can't be planned any more is refused. M16: a weekly one is
  // the program's next workout.
  const moves = isProgram(redo)
    ? planProgram(library.training, redo, input.profile, input.programDone)
    : isWorkout(redo) ? planWorkout(library.training, redo, input.profile, input.workoutsDone) : null;
  if (isWorkout(redo) && moves === null) throw new RangeError(`${redo.id} can't be planned for this player today`);
  const block = programBlockFor(library.training, redo, input.profile, input.programDone);
  const quest = draftQuest(redo, 'recovery', { code: 'second_wind' }, { moves, block });
  const xp = { ...quest.xp, discipline: (quest.xp.discipline ?? 0) + DISCIPLINE_PER_RECOVERY };
  return { ...day, quests: [...day.quests, { ...quest, xp }] };
}

/**
 * The quest Second Wind would put in the recovery slot today, or null when `addRecovery` would refuse it (M2 review: the
 * app offers Second Wind only when the server will accept it).
 */
export function secondWindRedo(
  library: QuestLibrary, input: DayInput, day: BuiltDay, missedCore: string, lastUsedDay: number | null,
): QuestDraft | null {
  try {
    return addRecovery(library, input, day, { kind: 'second_wind', missedCore, lastUsedDay }).quests.find((q) => q.slot === 'recovery')!;
  } catch (error) {
    if (error instanceof RangeError) return null;
    throw error;
  }
}

/**
 * Problems with a day the phone built offline (architecture §6); empty means the server can accept it. Rewards are never
 * taken from the phone: the server re-drafts each quest from its own tables.
 */
export function checkProvisionalDay(library: QuestLibrary, input: DayInput, day: BuiltDay): string[] {
  const ctx = dayContext(library, input);
  const problems: string[] = [];
  if (day.dayNumber !== input.dayNumber) problems.push(`wrong day number ${day.dayNumber}, expected ${input.dayNumber}`);
  if (day.hardDay) problems.push('a new day starts as a normal day');
  const slots = day.quests.map((q) => q.slot).sort();
  if (slots.join() !== 'article,core,side1,side2') problems.push(`slots must be core, side1, side2 and article, got ${slots.join(', ')}`);
  const keys = new Set<string>();
  let minutes = 0;
  for (const quest of day.quests) {
    const template = findTemplate(library, quest.templateId);
    if (!template) {
      problems.push(`unknown template ${quest.templateId}`);
      continue;
    }
    if (quest.slot === 'article') {
      if (template.role !== 'article') problems.push(`${template.id} is not the article quest`);
      continue;
    }
    if (template.role !== 'ladder' && template.role !== 'micro') {
      problems.push(`${template.id} can't fill the ${quest.slot} slot`);
      continue;
    }
    // A workout's exercises are the ones the server plans, so the sets the player logs fit it (M6e).
    if (!sameMoves(movesFor(ctx, template), quest.moves)) problems.push(`${template.id}'s exercises are not the ones planned`);
    if (!templateAllowed(template, input.profile)) problems.push(`${template.id} is not allowed for this player`);
    if (template.ladder !== null) {
      const ladder = ladderById(library, template.ladder);
      const state = input.ladders[ladder.id] ?? newLadder();
      if (!ladderAllowed(ladder, input.profile) || state.paused) problems.push(`${ladder.id} is not open to this player`);
      else if ((template.rung ?? 0) > Math.min(state.rung, allowedTopRung(library, ladder.id, input.profile))) {
        problems.push(`${template.id} is above the player's rung`);
      }
      if (ctx.strengthYesterday.has(ladder.id)) problems.push(`${ladder.id} was trained yesterday`);
    } else if (input.ladders[template.id]?.paused) {
      problems.push(`${template.id} is resting after pain`);
    }
    if (quest.slot === 'core' && ctx.afterStrength && template.exercise === 'strength') {
      problems.push('the core quest after a strength day must not be strength work');
    }
    const key = useKey(template);
    if (keys.has(key)) problems.push(`${key} is used twice`);
    keys.add(key);
    // A weekly workout takes the time it takes, outside the daily minutes, and comes only as the core quest of its own
    // days (M16 decision 4).
    if (!isProgram(template)) minutes += template.minutes;
    else if (quest.slot !== 'core' || programCandidate(ctx, day.light)?.template.id !== template.id) {
      problems.push(`${template.id} is not today's weekly workout`);
    }
  }
  // No movement twice in a day (M6c review): a workout and a strength quest it keeps out never share it. Both ways, since
  // the builder keeps out by slot order and a swap by the rest of the day (M6e).
  const kept = day.quests.filter((q) => QUEST_SLOTS.includes(q.slot)).flatMap((q) => {
    const template = findTemplate(library, q.templateId);
    return template === undefined ? [] : [{ key: useKey(template), out: keptOutBy(library, template, q.moves) }];
  });
  kept.forEach((a, i) => {
    for (const b of kept.slice(i + 1)) if (a.out.includes(b.key) && b.out.includes(a.key)) problems.push(`${a.key} and ${b.key} train the same movement`);
  });
  const budget = dayBudget(input);
  if (minutes > budget) problems.push(`the quests take ${minutes} minutes, over the day's ${budget}`);
  return problems;
}

/** A quest of a day the phone built offline, as the server reads it (M6e): it re-drafts the rest from its own tables. */
export type ProvisionalQuest = { slot: Slot; templateId: string; why: WhyReason; moves: readonly PlannedMove[] | null };

/**
 * The day the phone built offline, re-drafted from the server's tables (rewards, minutes, the book), or why it can't be
 * kept: a template this content doesn't know, a workout without its exercises, or what `checkProvisionalDay` finds.
 */
export function provisionalDay(
  library: QuestLibrary,
  input: DayInput,
  dayNumber: number,
  quests: readonly ProvisionalQuest[],
): { day: BuiltDay; problems: [] } | { day: null; problems: string[] } {
  const ctx = dayContext(library, input);
  const drafts: QuestDraft[] = [];
  for (const q of quests) {
    const template = findTemplate(library, q.templateId);
    if (template === undefined) return { day: null, problems: [`unknown template ${q.templateId}`] };
    try {
      drafts.push(draftQuest(template, q.slot, q.why, { book: bookFor(ctx, template), moves: q.moves, block: blockFor(ctx, template) }));
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      return { day: null, problems: [error.message] };
    }
  }
  const day: BuiltDay = {
    dayNumber, budget: dayBudget(input), light: input.light || input.dayNumber === 1, hardDay: false, articleId: input.articleId, quests: drafts,
  };
  const problems = checkProvisionalDay(library, input, day);
  return problems.length === 0 ? { day, problems: [] } : { day: null, problems };
}
