// The program layouts (M6c decision 4), from the owner's Kaizen workout builders (docs/research/kaizen-training.md
// §3.4): Men's and Women's are the builders' 3-day layouts, No preference their shared 2-day one. Each day lists its
// slots, most important first; a workout takes as many as its rung allows.
import type { BlockDay, MoveSlot, ProgramDay, ProgramStyle, WeeklyPrograms } from '../../../rules/src/index.ts';

export const PROGRAMS: Readonly<Record<ProgramStyle, readonly ProgramDay[]>> = {
  men: [
    ['incline_push', 'quads', 'horizontal_pull', 'shoulders', 'triceps', 'biceps'],
    ['squat', 'vertical_push', 'vertical_pull', 'hamstrings_glutes', 'abs', 'calves'],
    ['hip_hinge', 'horizontal_pull', 'chest', 'biceps', 'triceps', 'abs'],
  ],
  women: [
    ['hip_hinge', 'quads', 'horizontal_push', 'horizontal_pull', 'biceps', 'abs'],
    ['squat', 'hamstrings_glutes', 'vertical_pull', 'vertical_push', 'triceps', 'abs'],
    ['quads', 'hamstrings_glutes', 'horizontal_pull', 'chest', 'shoulders', 'abs'],
  ],
  none: [
    ['horizontal_push', 'horizontal_pull', 'quads', 'hamstrings_glutes', 'shoulders', 'abs'],
    ['squat', 'hip_hinge', 'vertical_pull', 'chest', 'shoulders', 'abs'],
  ],
};

// M15 (plan 2026-10-20-m15-weekly-program.md, decision 2): the weekly program, the same days in full, each slot with its
// sets in build-up weeks 1–5 from the builders' grids (kaizen-training.md §3.5 and Appendix A). Week 6, the easy week, is
// 2 sets of everything at half the reps (rules: planProgram).
const UP = [2, 3, 3, 4, 4] as const; // a priority slot: 4 sets in weeks 4–5
const EVEN = [2, 3, 3, 3, 3] as const;
const ARMS = [2, 2, 3, 3, 3] as const; // Men's 3-day day 1 arms

const day = (...slots: [MoveSlot, readonly number[]][]): BlockDay => slots.map(([slot, sets]) => ({ slot, sets }));

/** The builders' 2-day full-body days: every program at 2 a week, and No preference at 3 a week (alternating). */
const TWO_DAYS: readonly BlockDay[] = [
  day(['horizontal_push', UP], ['horizontal_pull', UP], ['quads', EVEN], ['hamstrings_glutes', EVEN], ['shoulders', EVEN], ['abs', EVEN]),
  day(['squat', UP], ['hip_hinge', UP], ['vertical_pull', EVEN], ['chest', EVEN], ['shoulders', EVEN], ['abs', EVEN]),
];

export const WEEKLY: WeeklyPrograms = {
  three: {
    men: [
      day(['incline_push', UP], ['quads', UP], ['horizontal_pull', EVEN], ['shoulders', UP], ['triceps', ARMS], ['biceps', ARMS]),
      day(['squat', UP], ['vertical_push', UP], ['vertical_pull', EVEN], ['hamstrings_glutes', EVEN], ['abs', EVEN], ['calves', EVEN]),
      day(['hip_hinge', UP], ['horizontal_pull', EVEN], ['chest', UP], ['biceps', EVEN], ['triceps', EVEN], ['abs', EVEN]),
    ],
    women: [
      day(['hip_hinge', UP], ['quads', EVEN], ['horizontal_push', UP], ['horizontal_pull', EVEN], ['biceps', EVEN], ['abs', EVEN]),
      day(['squat', UP], ['hamstrings_glutes', EVEN], ['vertical_pull', EVEN], ['vertical_push', UP], ['triceps', EVEN], ['abs', EVEN]),
      day(['quads', EVEN], ['hamstrings_glutes', EVEN], ['horizontal_pull', UP], ['chest', UP], ['shoulders', EVEN], ['abs', EVEN]),
    ],
    none: TWO_DAYS,
  },
  two: TWO_DAYS,
};
