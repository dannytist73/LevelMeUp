// M14 (plan 2026-10-19-m14-story-lessons.md, decision 1): the regulars, the six people the reading's stories follow.
// Each story stars one of them, picked by the deck writer for the article's topic; every story stands alone. They are
// made up, and the why card says so. Player-facing, so the lint and the app's font-subset test cover every line.

export const CAST = [
  { id: 'priya', name: 'Priya', line: '24, junior designer in her first job', topics: 'focus, work, learning, new skills' },
  { id: 'jonah', name: 'Jonah', line: '41, bus driver getting back into running', topics: 'movement, fitness, habits, starting again' },
  { id: 'mika', name: 'Mika', line: '29, night-shift nurse', topics: 'sleep, energy, stress, looking after others' },
  { id: 'tomas', name: 'Tomás', line: '34, new dad working from home', topics: 'time, family, routines, attention' },
  { id: 'amara', name: 'Amara', line: '19, first-year student', topics: 'study, procrastination, memory, confidence' },
  { id: 'lena', name: 'Lena', line: '52, runs a small bakery', topics: 'rest, slowing down, meaning, getting older' },
] as const;

export type CastId = (typeof CAST)[number]['id'];
export type CastMember = (typeof CAST)[number];

export const CAST_IDS: readonly CastId[] = CAST.map((c) => c.id);

/** One of the regulars by id, or undefined for an id this build doesn't know (a later server's). */
export function castMember(id: string): CastMember | undefined {
  return CAST.find((c) => c.id === id);
}
