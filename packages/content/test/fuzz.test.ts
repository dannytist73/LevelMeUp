import { describe, expect, it } from 'vitest';
import {
  CLASSES, GOALS, LIMITATIONS, MINUTES_OPTIONS, addRecovery, allowedTopRung, applyHardDay, applySwap, checkProvisionalDay,
  buildDay, ladderAllowed, ladderById, ladderRungs, mulberry32, newLadder, swapOptions, templateAllowed, templateById,
} from '../../rules/src/index.ts';
import type {
  BuiltDay, ClassId, DayInput, Difficulty, Goal, LadderState, PastDay, PlayerProfile, QuestTemplate, Slot,
} from '../../rules/src/index.ts';
import { LIBRARY } from '../src/library.ts';

// Seeded random player states against the real library: any class, minutes, goals, limitations, gentle start, own
// program, ladders at random rungs (some paused for pain), random 7-day histories and light days. The days test plays
// tidy histories; this one plays messy ones. Each problem keeps up to 3 examples.
const CASES = 10000;
const random = mulberry32(12345);
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!;
const FILLABLE = LIBRARY.templates.filter((t) => t.role === 'ladder' || t.role === 'micro');
const QUEST_SLOTS: readonly Slot[] = ['core', 'side1', 'side2'];

function randomInput(): DayInput {
  const goals: Goal[] = [pick(GOALS)];
  if (random() < 0.5) goals.push(pick(GOALS.filter((g) => g !== goals[0])));
  const profile: PlayerProfile = {
    classId: pick(Object.keys(CLASSES) as ClassId[]),
    level: 1 + Math.floor(random() * 20),
    goals,
    minutesPerDay: pick(MINUTES_OPTIONS),
    difficulty: pick<Difficulty>(['gentle', 'steady', 'hard']),
    limitations: LIMITATIONS.filter(() => random() < 0.3),
    gentleStart: random() < 0.25,
    ownProgram: random() < 0.25,
    stats: {
      strength: Math.floor(random() * 20), vitality: Math.floor(random() * 20),
      wisdom: Math.floor(random() * 20), focus: Math.floor(random() * 20),
    },
    book: random() < 0.5 ? 'A book' : null,
  };
  const ladders: Record<string, LadderState> = {};
  for (const ladder of LIBRARY.ladders) {
    if (random() < 0.2) continue;
    const top = ladderRungs(LIBRARY, ladder.id).length - 1;
    const rung = Math.floor(random() * (top + 1));
    ladders[ladder.id] = {
      ...newLadder(rung),
      highestRung: Math.min(top, rung + (random() < 0.3 ? 1 : 0)),
      paused: random() < 0.1,
      lastStepUpAt: random() < 0.5 ? 0 : null,
    };
  }
  const dayNumber = 1 + Math.floor(random() * 60);
  const history: PastDay[] = [];
  for (let d = Math.max(1, dayNumber - 7); d < dayNumber; d++) {
    if (random() < 0.15) continue;
    const quests: Partial<Record<Slot, string>> = { core: pick(FILLABLE).id, side1: pick(FILLABLE).id, side2: pick(FILLABLE).id };
    if (random() < 0.2) quests.recovery = random() < 0.5 ? pick(FILLABLE).id : 'recovery-walk';
    history.push({ dayNumber: d, quests });
  }
  return { dayNumber, profile, ladders, history, light: random() < 0.2, articleId: null };
}

const cases = Array.from({ length: CASES }, () => {
  const input = randomInput();
  return { input, day: buildDay(LIBRARY, input) };
});

function collector() {
  const problems: Record<string, string[]> = {};
  const note = (kind: string, example: string): void => {
    const list = (problems[kind] ??= []);
    if (list.length < 3) list.push(example);
  };
  return { problems, note };
}

/** The rules every quest in a day (built, swapped or hard) must keep. */
function checkDay(input: DayInput, day: BuiltDay, note: (kind: string, example: string) => void): void {
  const { profile } = input;
  const yesterday = input.history.find((past) => past.dayNumber === input.dayNumber - 1);
  const yesterdays = Object.values(yesterday?.quests ?? {}).map((id) => templateById(LIBRARY, id!));
  const strengthYesterday = new Set(yesterdays.filter((t) => t.exercise === 'strength' && t.ladder !== null).map((t) => t.ladder));
  const afterStrength = (['core', 'recovery'] as const).some((slot) => {
    const id = yesterday?.quests[slot];
    return id !== undefined && templateById(LIBRARY, id).exercise === 'strength';
  });
  const quests = day.quests.filter((q) => q.slot !== 'article');
  const keys = quests.map((q) => q.ladder ?? q.templateId);
  if (new Set(keys).size !== keys.length) note('a ladder used twice', keys.join(', '));
  const minutes = quests.filter((q) => QUEST_SLOTS.includes(q.slot)).reduce((sum, q) => sum + templateById(LIBRARY, q.templateId).minutes, 0);
  if (minutes > day.budget) note('over budget', `${minutes} > ${day.budget}`);
  for (const quest of quests) {
    const template: QuestTemplate = templateById(LIBRARY, quest.templateId);
    if (!templateAllowed(template, profile)) note('not allowed', `${template.id} ${profile.limitations.join(',')}`);
    if (profile.gentleStart && template.exercise !== null && !(template.gentle && template.exercise !== 'strength')) {
      note('gentle start', template.id);
    }
    if (template.ladder !== null) {
      const state = input.ladders[template.ladder] ?? newLadder();
      if (!ladderAllowed(ladderById(LIBRARY, template.ladder), profile)) note('closed ladder', template.id);
      if (state.paused) note('paused ladder', template.id);
      if ((template.rung ?? 0) > Math.min(state.rung, allowedTopRung(LIBRARY, template.ladder, profile))) note('above the rung', template.id);
      if (quest.slot !== 'recovery' && template.exercise === 'strength' && strengthYesterday.has(template.ladder)) {
        note('strength ladder two days running', template.id);
      }
    }
    if (quest.slot === 'core' && afterStrength && template.exercise === 'strength') note('strength core after a strength day', template.id);
  }
}

describe(`${CASES} random player states against the real library`, () => {
  it('builds days that keep every rule, the same way twice, and that the offline check accepts', () => {
    const { problems, note } = collector();
    for (const { input, day } of cases) {
      checkDay(input, day, note);
      if (JSON.stringify(buildDay(LIBRARY, input)) !== JSON.stringify(day)) note('not deterministic', String(input.dayNumber));
      const rejected = checkProvisionalDay(LIBRARY, input, day);
      if (rejected.length > 0) note('offline check rejects a built day', rejected.join('; '));
      for (const quest of day.quests) {
        if (quest.why.code === 'short_on_time' && quest.why.minutes !== day.budget) {
          note('why-line minutes', `${quest.why.minutes} on a ${day.budget}-minute day`);
        }
      }
    }
    expect(problems).toEqual({});
  });

  it('swaps on normal and hard days keep every rule and the hard-day version', () => {
    const { problems, note } = collector();
    for (const { input, day } of cases) {
      for (const base of [day, applyHardDay(LIBRARY, day, [])]) {
        for (const slot of QUEST_SLOTS) {
          for (const option of swapOptions(LIBRARY, input, base, slot)) {
            const swapped = applySwap(LIBRARY, input, base, slot, option.templateId, []);
            checkDay(input, swapped, note);
            if (base.hardDay && !swapped.quests.find((q) => q.slot === slot)!.hardDay) note('hard day lost in a swap', option.templateId);
            if (!base.hardDay) {
              const rejected = checkProvisionalDay(LIBRARY, input, swapped);
              if (rejected.length > 0) note('offline check rejects a swapped day', rejected.join('; '));
            }
          }
        }
      }
    }
    expect(problems).toEqual({});
  });

  it("Second Wind's redo keeps the ladder rules, or is refused", () => {
    const { problems, note } = collector();
    let redone = 0;
    for (const { input, day } of cases) {
      const missedCore = input.history.find((past) => past.dayNumber === input.dayNumber - 1)?.quests.core;
      if (missedCore === undefined) continue;
      const warrior: DayInput = { ...input, profile: { ...input.profile, classId: 'warrior', level: Math.max(5, input.profile.level) } };
      let withRedo: BuiltDay;
      try {
        withRedo = addRecovery(LIBRARY, warrior, day, { kind: 'second_wind', missedCore, lastUsedDay: null });
      } catch (error) {
        if (!(error instanceof RangeError)) note('Second Wind throws something other than a refusal', String(error));
        continue;
      }
      redone++;
      checkDay(warrior, withRedo, note);
    }
    expect(problems).toEqual({});
    expect(redone).toBeGreaterThan(CASES / 10);
  });
});
