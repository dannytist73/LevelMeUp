// The base app's training (docs/2026-10-28-base-app.md, "Train"): the builders' 4x and 5x days beside our 2x and 3x
// (docs/research/kaizen-training.md §3.4; 5x Day 3's shrugs become abs, as we have no shrug), and gym exercises for the
// slots that only had home versions. The game's MOVES stay as they are; the base app uses BASE_MOVES.
import type { BaseDayLayouts, BlockDay, MoveSlot } from '../../../rules/src/index.ts';
import { MOVES } from './moves.ts';
import type { AuthoredMove } from './moves.ts';
import { WEEKLY } from './programs.ts';

const UP = [2, 3, 3, 4, 4] as const;
const EVEN = [2, 3, 3, 3, 3] as const;
/** A day: its first two slots are the priority compounds (4 sets in weeks 4 and 5), the rest 3. */
const day = (...slots: MoveSlot[]): BlockDay => slots.map((slot, i) => ({ slot, sets: i < 2 ? UP : EVEN }));

export const BASE_LAYOUTS: BaseDayLayouts = {
  two: WEEKLY.two,
  three: { men: WEEKLY.three.men, women: WEEKLY.three.women },
  four: {
    men: [
      day('incline_push', 'horizontal_pull', 'chest', 'triceps', 'biceps'),
      day('squat', 'hamstrings_glutes', 'vertical_pull', 'shoulders', 'abs'),
      day('horizontal_push', 'horizontal_pull', 'vertical_push', 'biceps', 'triceps'),
      day('hip_hinge', 'quads', 'shoulders', 'calves', 'abs'),
    ],
    women: [
      day('horizontal_push', 'horizontal_pull', 'vertical_pull', 'triceps', 'biceps'),
      day('squat', 'hamstrings_glutes', 'quads', 'shoulders', 'abs'),
      day('vertical_pull', 'vertical_push', 'horizontal_pull', 'biceps', 'triceps'),
      day('hip_hinge', 'quads', 'hamstrings_glutes', 'shoulders', 'abs'),
    ],
  },
  five: [
    day('incline_push', 'vertical_push', 'chest', 'shoulders', 'triceps'),
    day('horizontal_pull', 'vertical_pull', 'shoulders', 'biceps', 'abs'),
    day('squat', 'hamstrings_glutes', 'quads', 'calves', 'abs'),
    day('horizontal_push', 'vertical_pull', 'horizontal_pull', 'biceps', 'triceps'),
    day('hip_hinge', 'quads', 'hamstrings_glutes', 'calves', 'abs'),
  ],
};

/** Machine and cable picks (the Kaizen directory's gym options), so every slot has a gym version. */
export const GYM_EXTRAS: readonly AuthoredMove[] = [
  {
    id: 'incline-machine-press', name: 'Incline machine press', slots: ['incline_push', 'chest'], pattern: 'push', needs: ['gym'],
    level: 1, unit: 'reps', min: 8, max: 12, perSide: false, contraindications: ['shoulder'],
    steps: ['Set the seat so the handles start at your upper chest.', 'Press up and forward until your arms are straight, then come back slowly.'],
    cue: 'Keep your back against the pad and your shoulders down.',
  },
  {
    id: 'machine-shoulder-press', name: 'Machine shoulder press', slots: ['vertical_push'], pattern: 'press', needs: ['gym'],
    level: 1, unit: 'reps', min: 8, max: 12, perSide: false, contraindications: ['shoulder'],
    steps: ['Set the seat so the handles start at shoulder height.', 'Press the handles up until your arms are straight, then lower slowly.'],
    cue: 'Keep your back against the pad and your ribs down.',
  },
  {
    id: 'leg-extension', name: 'Leg extensions', slots: ['quads'], pattern: 'isolation', needs: ['gym'],
    level: 1, unit: 'reps', min: 10, max: 15, perSide: false, contraindications: ['knee'],
    steps: ["Sit with the pad on the front of your ankles and your knees in line with the machine's pivot.", 'Straighten your legs, pause, then lower slowly.'],
    cue: 'Move smoothly and stop short of any knee pain.',
  },
  {
    id: 'seated-leg-curl', name: 'Seated leg curls', slots: ['hamstrings_glutes'], pattern: 'isolation', needs: ['gym'],
    level: 1, unit: 'reps', min: 10, max: 15, perSide: false, contraindications: [],
    steps: ['Sit with the pad behind your ankles and the thigh pad snug.', 'Curl your heels down and back, then let them return slowly.'],
    cue: 'Keep your hips on the seat the whole time.',
  },
  {
    id: 'cable-lateral-raise', name: 'Cable lateral raises', slots: ['shoulders'], pattern: 'isolation', needs: ['gym'],
    level: 1, unit: 'reps', min: 12, max: 15, perSide: true, contraindications: ['shoulder'],
    steps: ['Stand side-on to a low cable and hold the handle in your far hand.', 'Raise your arm out to the side to shoulder height, then lower slowly. Do every rep, then switch.'],
    cue: 'Lead with your elbow and keep your shoulder down.',
  },
  {
    id: 'cable-curl', name: 'Cable curls', slots: ['biceps'], pattern: 'isolation', needs: ['gym'],
    level: 1, unit: 'reps', min: 10, max: 15, perSide: false, contraindications: [],
    steps: ['Stand facing a low cable with a bar or rope, palms up.', 'Curl your hands to your shoulders, then lower slowly.'],
    cue: 'Keep your elbows at your sides and your body still.',
  },
  {
    id: 'cable-pushdown', name: 'Cable pushdowns', slots: ['triceps'], pattern: 'isolation', needs: ['gym'],
    level: 1, unit: 'reps', min: 10, max: 15, perSide: false, contraindications: [],
    steps: ['Stand facing a high cable with a bar or rope, elbows bent at your sides.', 'Push down until your arms are straight, then let your hands rise slowly.'],
    cue: 'Keep your elbows pinned to your sides.',
  },
  {
    id: 'cable-crunch', name: 'Cable crunches', slots: ['abs'], pattern: 'core', needs: ['gym'],
    level: 1, unit: 'reps', min: 10, max: 15, perSide: false, contraindications: ['back'],
    steps: ['Kneel facing a high cable and hold the rope beside your head.', 'Curl your chest toward your knees, then come back up slowly.'],
    cue: 'Move from your middle, not your hips or arms.',
  },
  {
    id: 'machine-calf-raise', name: 'Machine calf raises', slots: ['calves'], pattern: 'isolation', needs: ['gym'],
    level: 1, unit: 'reps', min: 10, max: 15, perSide: false, contraindications: [],
    steps: ['Stand or sit in the machine with the balls of your feet on the edge.', 'Rise onto your toes, pause, then lower your heels slowly.'],
    cue: 'Pause at the top and stretch at the bottom.',
  },
];

export const BASE_MOVES: readonly AuthoredMove[] = [...MOVES, ...GYM_EXTRAS];

export function baseMove(id: string): AuthoredMove {
  const move = BASE_MOVES.find((m) => m.id === id);
  if (move === undefined) throw new RangeError(`unknown move ${id}`);
  return move;
}
