import { abilityReady, abilityUnlocked } from './abilities.ts';
import { DISCIPLINE_PER_RECOVERY, REST_DAYS_PER_WEEK, SWAP_SAME_STAT_CHOICES, WEEK_QUEST_DAYS } from './constants.ts';
import { balanceChoice, bookFor, dayBudget, dayContext, draftQuest, ladderCandidates, microCandidates, useKey } from './day.ts';
import type { BuiltDay, DayInput, QuestDraft } from './day.ts';
import { newLadder } from './ladder.ts';
import {
  allowedTopRung, findTemplate, ladderAllowed, ladderById, specialTemplate, templateAllowed, templateById, validateProfile,
} from './library.ts';
import type { QuestLibrary } from './library.ts';
import type { Slot } from './types.ts';

const QUEST_SLOTS: readonly Slot[] = ['core', 'side1', 'side2'];

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
 * minutes the other two quests leave. Yesterday's strength ladders and the after-strength rule still apply.
 */
export function swapOptions(library: QuestLibrary, input: DayInput, day: BuiltDay, slot: Slot): QuestDraft[] {
  if (!QUEST_SLOTS.includes(slot)) throw new RangeError(`only the core and side quests can be swapped, not ${slot}`);
  const ctx = dayContext(library, input);
  const current = templateById(library, questIn(day, slot).templateId);
  const others = QUEST_SLOTS.filter((s) => s !== slot).map((s) => templateById(library, questIn(day, s).templateId));
  const allowance = day.budget - others.reduce((sum, t) => sum + t.minutes, 0);
  const used = new Set([current, ...others].map(useKey));
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
  return candidates.map((c) => draftQuest(c.template, slot, { code: 'swap' }, { hardDay: day.hardDay, book: bookFor(ctx, c.template) }));
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
        ? draftQuest(templateById(library, q.templateId), q.slot, q.why, { hardDay: true, book: q.book })
        : q,
    ),
  };
}

/** At most 2 planned rest days in any 7 consecutive quest days (spec §3.5). Rest protects the streak; nothing else. */
export function restAllowed(restDays: readonly number[], dayNumber: number): boolean {
  if (!Number.isInteger(dayNumber) || dayNumber < 1) throw new RangeError(`dayNumber must be an integer of at least 1, got ${dayNumber}`);
  const days = [...new Set([...restDays, dayNumber])].sort((a, b) => a - b);
  for (let i = 0; i + REST_DAYS_PER_WEEK < days.length; i++) {
    if (days[i + REST_DAYS_PER_WEEK]! - days[i]! < WEEK_QUEST_DAYS) return false;
  }
  return true;
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
 * Second Wind (Warrior level 5, every 7 quest days) the missed core quest again, for its full XP plus that Discipline.
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
  const missed = templateById(library, option.missedCore);
  if ((missed.role !== 'ladder' && missed.role !== 'micro') || !templateAllowed(missed, input.profile)) {
    throw new RangeError(`${missed.id} can't be redone with Second Wind`);
  }
  const quest = draftQuest(missed, 'recovery', { code: 'second_wind' });
  const xp = { ...quest.xp, discipline: (quest.xp.discipline ?? 0) + DISCIPLINE_PER_RECOVERY };
  return { ...day, quests: [...day.quests, { ...quest, xp }] };
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
    if (!templateAllowed(template, input.profile)) problems.push(`${template.id} is not allowed for this player`);
    if (template.ladder !== null) {
      const ladder = ladderById(library, template.ladder);
      const state = input.ladders[ladder.id] ?? newLadder();
      if (!ladderAllowed(ladder, input.profile) || state.paused) problems.push(`${ladder.id} is not open to this player`);
      else if ((template.rung ?? 0) > Math.min(state.rung, allowedTopRung(library, ladder.id, input.profile))) {
        problems.push(`${template.id} is above the player's rung`);
      }
      if (ctx.strengthYesterday.has(ladder.id)) problems.push(`${ladder.id} was trained yesterday`);
    }
    if (quest.slot === 'core' && ctx.afterStrength && template.exercise === 'strength') {
      problems.push('the core quest after a strength day must not be strength work');
    }
    const key = useKey(template);
    if (keys.has(key)) problems.push(`${key} is used twice`);
    keys.add(key);
    minutes += template.minutes;
  }
  const budget = dayBudget(input);
  if (minutes > budget) problems.push(`the quests take ${minutes} minutes, over the day's ${budget}`);
  return problems;
}
