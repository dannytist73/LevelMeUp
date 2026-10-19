// M15, the weekly program (plan 2026-10-20-m15-weekly-program.md) with the real library: the builder's grids, a plan for
// every setup, the minutes a workout day takes, the days it comes on, and its words.
import { describe, expect, it } from 'vitest';
import {
  EQUIPMENT, LIMITATIONS, PROGRAM_STYLES, buildDay, hasEquipment, ladderRungs, newLadder, planProgram, programBlock, sessionMinutes,
  weeklyDays,
} from '../../rules/src/index.ts';
import type { BuiltDay, Equipment, LadderState, Limitation, PastDay, PlayerProfile } from '../../rules/src/index.ts';
import { ADJUST_TEXT, PLAY_TEXT } from '../src/index.ts';
import { LADDERS, LIBRARY } from '../src/library.ts';
import { lintText } from '../src/lint.ts';
import { MOVES } from '../src/training/moves.ts';
import { PROGRAMS, WEEKLY } from '../src/training/programs.ts';

const player = (over: Partial<PlayerProfile> = {}): PlayerProfile => ({
  classId: 'warrior', level: 5, goals: ['body'], minutesPerDay: 25, difficulty: 'steady', limitations: [], gentleStart: false,
  ownProgram: false, equipment: [], programStyle: 'men', trainingPlan: 'weekly', programDays: 3,
  stats: { strength: 7, vitality: 5, wisdom: 5, focus: 5 }, book: null, ...over,
});
const SETUPS: Equipment[][] = [[], ['bands'], ['dumbbells'], ['dumbbells', 'bench'], ['pullup_bar'], ['bands', 'dumbbells', 'bench', 'pullup_bar'], ['gym']];
const RUNGS = ladderRungs(LIBRARY, 'program');
const grid = (days: typeof WEEKLY.two) => days.map((d) => d.map((s) => `${s.slot} ${s.sets.join('-')}`));

describe('the builder\'s grids (decision 2)', () => {
  it('the weekly days are the program days in full, slot for slot', () => {
    for (const style of PROGRAM_STYLES) {
      const days = style === 'none' ? WEEKLY.two : WEEKLY.three[style];
      expect(days.map((d) => d.map((s) => s.slot)), style).toEqual(PROGRAMS[style]);
    }
    expect(WEEKLY.three.none).toBe(WEEKLY.two);
  });

  it('copies the sets of weeks 1–5 from the builder (kaizen-training.md Appendix A)', () => {
    expect(grid(WEEKLY.three.men)).toEqual([
      ['incline_push 2-3-3-4-4', 'quads 2-3-3-4-4', 'horizontal_pull 2-3-3-3-3', 'shoulders 2-3-3-4-4', 'triceps 2-2-3-3-3', 'biceps 2-2-3-3-3'],
      ['squat 2-3-3-4-4', 'vertical_push 2-3-3-4-4', 'vertical_pull 2-3-3-3-3', 'hamstrings_glutes 2-3-3-3-3', 'abs 2-3-3-3-3', 'calves 2-3-3-3-3'],
      ['hip_hinge 2-3-3-4-4', 'horizontal_pull 2-3-3-3-3', 'chest 2-3-3-4-4', 'biceps 2-3-3-3-3', 'triceps 2-3-3-3-3', 'abs 2-3-3-3-3'],
    ]);
    expect(grid(WEEKLY.three.women)).toEqual([
      ['hip_hinge 2-3-3-4-4', 'quads 2-3-3-3-3', 'horizontal_push 2-3-3-4-4', 'horizontal_pull 2-3-3-3-3', 'biceps 2-3-3-3-3', 'abs 2-3-3-3-3'],
      ['squat 2-3-3-4-4', 'hamstrings_glutes 2-3-3-3-3', 'vertical_pull 2-3-3-3-3', 'vertical_push 2-3-3-4-4', 'triceps 2-3-3-3-3', 'abs 2-3-3-3-3'],
      ['quads 2-3-3-3-3', 'hamstrings_glutes 2-3-3-3-3', 'horizontal_pull 2-3-3-4-4', 'chest 2-3-3-4-4', 'shoulders 2-3-3-3-3', 'abs 2-3-3-3-3'],
    ]);
    expect(grid(WEEKLY.two)).toEqual([
      ['horizontal_push 2-3-3-4-4', 'horizontal_pull 2-3-3-4-4', 'quads 2-3-3-3-3', 'hamstrings_glutes 2-3-3-3-3', 'shoulders 2-3-3-3-3', 'abs 2-3-3-3-3'],
      ['squat 2-3-3-4-4', 'hip_hinge 2-3-3-4-4', 'vertical_pull 2-3-3-3-3', 'chest 2-3-3-3-3', 'shoulders 2-3-3-3-3', 'abs 2-3-3-3-3'],
    ]);
  });
});

describe('every setup gets its weekly workouts (decision 6)', () => {
  it('plans every day and week of every program for every equipment set and level, within them', () => {
    for (const equipment of SETUPS) {
      for (const programStyle of PROGRAM_STYLES) {
        for (const programDays of [2, 3]) {
          const who = player({ equipment, programStyle, programDays });
          const days = weeklyDays(LIBRARY.training, who).length;
          for (const template of RUNGS) {
            for (let done = 0; done < 18; done++) {
              const label = `${equipment.join('+') || 'body'} ${programStyle} ${programDays}/week ${template.id} done ${done}`;
              const plan = planProgram(LIBRARY.training, template, who, done);
              expect(plan, label).not.toBeNull();
              const block = programBlock(done, programDays, days);
              // Bodyweight at level 1 can leave a slot out; a gym never does.
              if (equipment.includes('gym')) expect(plan!.length, label).toBe(6);
              expect(plan!.length, label).toBeGreaterThanOrEqual(4);
              for (const m of plan!) {
                const move = MOVES.find((x) => x.id === m.move)!;
                expect(hasEquipment(move, equipment), label).toBe(true);
                if (template.condition.kind === 'program') expect(move.level, label).toBeLessThanOrEqual(template.condition.level);
                const allowed = block.week === 1 || block.week === 6 ? [2] : block.week <= 3 ? [2, 3] : [3, 4];
                expect(allowed, label).toContain(m.sets);
                expect(m.min, label).toBeLessThanOrEqual(m.max);
              }
            }
          }
        }
      }
    }
  });

  it('never plans an exercise a reported limit rules out', () => {
    const sets: Limitation[][] = [[...LIMITATIONS], ['knee'], ['back'], ['shoulder'], ['wrist']];
    for (const limitations of sets) {
      for (const programStyle of PROGRAM_STYLES) {
        for (let done = 0; done < 3; done++) {
          const who = player({ limitations, programStyle, equipment: [...EQUIPMENT] });
          const plan = planProgram(LIBRARY.training, RUNGS[2]!, who, done);
          if (plan === null) continue;
          expect(plan.length).toBeGreaterThanOrEqual(2);
          for (const m of plan) {
            const move = MOVES.find((x) => x.id === m.move)!;
            expect(move.contraindications.some((c) => limitations.includes(c)), `${m.move} with ${limitations.join('+')}`).toBe(false);
          }
        }
      }
    }
  });

  it('a gym day takes 29 minutes in week 1, about 40 in weeks 2–3, up to 50 in weeks 4–5, and the easy week is light again', () => {
    const who = player({ equipment: ['gym'] });
    const minutes = (done: number) => sessionMinutes(RUNGS[2]!, planProgram(LIBRARY.training, RUNGS[2]!, who, done)!, false);
    expect([0, 1, 2].map(minutes)).toEqual([29, 29, 29]);
    expect([3, 4, 5].map(minutes)).toEqual([38, 43, 43]); // Men's day 1 keeps its arms at 2 sets in week 2
    expect([9, 10, 11].map(minutes)).toEqual([50, 47, 47]);
    expect([15, 16, 17].map(minutes)).toEqual([29, 29, 29]);
    const easy = planProgram(LIBRARY.training, RUNGS[2]!, who, 15)!;
    const full = planProgram(LIBRARY.training, RUNGS[2]!, who, 12)!;
    easy.forEach((m, i) => expect(m.max).toBe(Math.ceil(full[i]!.max / 2)));
  });
});

/** Plays a weekly player's days in a row, everything done. */
function play(profile: PlayerProfile, days: number): BuiltDay[] {
  const ladders: Record<string, LadderState> = { program: newLadder(1) };
  const history: PastDay[] = [];
  const built: BuiltDay[] = [];
  let programDone = 0;
  for (let dayNumber = 1; dayNumber <= days; dayNumber++) {
    const day = buildDay(LIBRARY, { dayNumber, profile, ladders, history: history.slice(-7), light: false, workoutsDone: 0, programDone, articleId: 'a' });
    built.push(day);
    history.push({ dayNumber, quests: Object.fromEntries(day.quests.map((q) => [q.slot, q.templateId])) });
    if (day.quests.some((q) => q.ladder === 'program')) programDone++;
  }
  return built;
}

describe('weekly workout days with the real library (decision 4)', () => {
  it('every class, every daily time: 3 workouts in any 7 days, none two days running, no other strength work', () => {
    for (const classId of ['warrior', 'rogue', 'mage', 'monk'] as const) {
      for (const minutesPerDay of [10, 15, 25, 40]) {
        const days = play(player({ classId, minutesPerDay, equipment: ['dumbbells'] }), 28);
        const on = days.filter((d) => d.quests.some((q) => q.ladder === 'program')).map((d) => d.dayNumber);
        expect(on, `${classId} ${minutesPerDay}`).toEqual([2, 4, 6, 9, 11, 13, 16, 18, 20, 23, 25, 27]);
        for (const day of days) {
          for (const q of day.quests) {
            const template = LIBRARY.templates.find((t) => t.id === q.templateId)!;
            if (template.exercise === 'strength') expect(q.ladder, `${classId} day ${day.dayNumber} ${q.templateId}`).toBe('program');
          }
          if (on.includes(day.dayNumber)) {
            const workout = day.quests.find((q) => q.ladder === 'program')!;
            expect(workout.slot).toBe('core');
            expect(workout.why).toEqual({ code: 'program' });
          }
        }
      }
    }
  });
});

describe('the words (M15)', () => {
  it('name every week, every plan and every choice, and pass the lint', () => {
    expect(PLAY_TEXT.workout.weeks).toHaveLength(6);
    const all = [
      PLAY_TEXT.workout.block, PLAY_TEXT.workout.easyBlock, ...PLAY_TEXT.workout.weeks,
      ADJUST_TEXT.training.plan, ADJUST_TEXT.training.days, ADJUST_TEXT.training.weeklyNote, ADJUST_TEXT.training.noRoomWeekly,
      ADJUST_TEXT.training.planTomorrow, ADJUST_TEXT.training.offer, ADJUST_TEXT.training.offerGo,
      ...Object.values(ADJUST_TEXT.training.plans).flatMap((p) => [p.name, p.line]),
      ...Object.values(ADJUST_TEXT.training.dayChoices).flatMap((p) => [p.name, p.line]),
    ];
    for (const text of all) expect(lintText(text), text).toEqual([]);
    expect(LADDERS.find((l) => l.id === 'program')).toBeDefined();
  });
});
