// The program layouts (M6c decision 4), from the owner's Kaizen workout builders (docs/research/kaizen-training.md
// §3.4): Men's and Women's are the builders' 3-day layouts, No preference their shared 2-day one. Each day lists its
// slots, most important first; a workout takes as many as its rung allows.
import type { ProgramDay, ProgramStyle } from '../../../rules/src/index.ts';

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
