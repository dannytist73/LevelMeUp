import { describe, expect, it } from 'vitest';
import { EQUIPMENT, LIMITATIONS, MOVE_PATTERNS, MOVE_SLOTS, PROGRAM_STYLES, hasEquipment, planWorkout } from '../../rules/src/index.ts';
import type { Equipment, PlayerProfile } from '../../rules/src/index.ts';
import { LIBRARY, TEMPLATES } from '../src/library.ts';
import { lintText } from '../src/lint.ts';
import { MOVES, authoredMove, progressLine } from '../src/training/moves.ts';
import { WORKOUT_TEMPLATES } from '../src/quests/workout.ts';
import { PROGRAMS } from '../src/training/programs.ts';

describe('the exercise library (M6c decision 3)', () => {
  it('has 53 moves with unique ids and names', () => {
    expect(MOVES).toHaveLength(53);
    expect(new Set(MOVES.map((m) => m.id)).size).toBe(MOVES.length);
    expect(new Set(MOVES.map((m) => m.name)).size).toBe(MOVES.length);
    for (const m of MOVES) expect(m.id).toMatch(/^[a-z0-9-]{1,40}$/);
  });

  it('every move is well formed', () => {
    for (const m of MOVES) {
      expect(m.slots.length, m.id).toBeGreaterThan(0);
      for (const s of m.slots) expect(MOVE_SLOTS, m.id).toContain(s);
      expect(MOVE_PATTERNS, m.id).toContain(m.pattern);
      for (const e of m.needs) expect(EQUIPMENT, m.id).toContain(e);
      for (const c of m.contraindications) expect(LIMITATIONS, m.id).toContain(c);
      expect([1, 2, 3], m.id).toContain(m.level);
      expect(Number.isInteger(m.min) && Number.isInteger(m.max) && m.min >= 3 && m.min < m.max && m.max <= 60, m.id).toBe(true);
      expect(m.steps.length, m.id).toBeGreaterThanOrEqual(2);
      expect(m.steps.length, m.id).toBeLessThanOrEqual(3);
      expect(m.cue.length, m.id).toBeGreaterThan(10);
    }
  });

  it('every barbell lift is level 3 and says to learn it light', () => {
    for (const m of MOVES.filter((x) => x.id.startsWith('barbell-'))) {
      expect(m.level, m.id).toBe(3);
      expect(m.cue, m.id).toMatch(/light bar first/);
    }
  });

  it('nothing tells the player to go to failure, and the words pass the lint', () => {
    for (const m of MOVES) {
      for (const text of [m.name, ...m.steps, m.cue, progressLine(m)]) {
        expect(lintText(text), `${m.id}: ${text}`).toEqual([]);
        expect(text.toLowerCase(), m.id).not.toMatch(/failure|to fail|max out|all-out/);
      }
    }
  });

  it('rules out at least what the same exercise rules out as a quest; loaded squats rule out a back limitation (review)', () => {
    for (const m of MOVES) {
      for (const t of TEMPLATES.filter((x) => x.name === m.name)) {
        for (const tag of t.contraindications) expect(m.contraindications, `${m.id} vs ${t.id}`).toContain(tag);
      }
    }
    for (const m of MOVES.filter((x) => x.pattern === 'squat' && x.needs.length > 0)) expect(m.contraindications, m.id).toContain('back');
  });

  it('the progress line follows the kind of move', () => {
    expect(progressLine(authoredMove('plank'))).toMatch(/hold a few seconds longer/);
    expect(progressLine(authoredMove('band-row'))).toMatch(/stronger band/);
    expect(progressLine(authoredMove('goblet-squat'))).toMatch(/heavier/);
    expect(progressLine(authoredMove('push-up'))).toMatch(/lower more slowly/);
    expect(() => authoredMove('kettlebell-swing')).toThrow(RangeError);
  });
});

describe('the programs (decision 4)', () => {
  it('Men\'s and Women\'s have three days, No preference two, each with six slots', () => {
    for (const style of PROGRAM_STYLES) {
      expect(PROGRAMS[style]).toHaveLength(style === 'none' ? 2 : 3);
      for (const day of PROGRAMS[style]) {
        expect(day).toHaveLength(6);
        for (const slot of day) expect(MOVE_SLOTS).toContain(slot);
      }
    }
  });

  it('every slot a program uses has a move', () => {
    for (const style of PROGRAM_STYLES) {
      for (const slot of PROGRAMS[style].flat()) expect(MOVES.some((m) => m.slots.includes(slot)), slot).toBe(true);
    }
  });
});

const player = (over: Partial<PlayerProfile> = {}): PlayerProfile => ({
  classId: 'warrior', level: 5, goals: ['body'], minutesPerDay: 40, difficulty: 'steady', limitations: [], gentleStart: false,
  ownProgram: false, equipment: [], programStyle: 'none', trainingPlan: 'build', programDays: 3, stats: { strength: 7, vitality: 5, wisdom: 5, focus: 5 }, book: null, ...over,
});
const SETUPS: Equipment[][] = [[], ['bands'], ['dumbbells'], ['dumbbells', 'bench'], ['pullup_bar'], ['bands', 'dumbbells', 'bench', 'pullup_bar'], ['gym']];

describe('every setup gets its workouts (decision 5)', () => {
  it('plans every rung of every program for every equipment set, in full, within the equipment and level', () => {
    for (const equipment of SETUPS) {
      for (const programStyle of PROGRAM_STYLES) {
        for (const template of WORKOUT_TEMPLATES) {
          if (template.condition.kind !== 'workout') throw new Error(template.id);
          for (let done = 0; done < 3; done++) {
            const label = `${equipment.join('+') || 'body'} ${programStyle} ${template.id} day ${done}`;
            const plan = planWorkout(LIBRARY.training, template, player({ equipment, programStyle }), done);
            expect(plan, label).not.toBeNull();
            expect(plan!.length, label).toBe(template.condition.sets.length);
            expect(new Set(plan!.map((m) => m.move)).size, label).toBe(plan!.length);
            for (const m of plan!) {
              const move = authoredMove(m.move);
              expect(hasEquipment(move, equipment), `${label}: ${m.move}`).toBe(true);
              expect(move.level, `${label}: ${m.move}`).toBeLessThanOrEqual(template.condition.level);
            }
          }
        }
      }
    }
  });

  it('never plans an exercise a reported limit rules out; with every limit, a plan has 2 exercises or none', () => {
    for (const limitations of [['knee'], ['back'], ['shoulder'], ['wrist'], ['knee', 'back', 'shoulder', 'wrist']] as const) {
      for (const equipment of SETUPS) {
        for (const template of WORKOUT_TEMPLATES) {
          const plan = planWorkout(LIBRARY.training, template, player({ equipment, limitations: [...limitations] }), 0);
          if (plan === null) continue;
          expect(plan.length).toBeGreaterThanOrEqual(2);
          for (const m of plan) for (const tag of authoredMove(m.move).contraindications) expect(limitations).not.toContain(tag);
        }
      }
    }
  });

  it('climbs: bodyweight push-ups from the wall to the floor; a gym from machines to dumbbells to barbells', () => {
    const first = (level: number, equipment: Equipment[], style: 'none' | 'men' = 'none', done = 0) =>
      planWorkout(LIBRARY.training, WORKOUT_TEMPLATES[level - 1]!, player({ equipment, programStyle: style }), done)![0]!.move;
    expect([1, 2, 3].map((l) => first(l, []))).toEqual(['wall-push-up', 'incline-push-up', 'push-up']);
    expect([1, 2, 3].map((l) => first(l, ['gym'], 'men', 1))).toEqual(['leg-press', 'db-split-squat', 'barbell-squat']);
  });
});
