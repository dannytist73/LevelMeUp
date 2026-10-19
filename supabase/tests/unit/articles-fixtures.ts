// A brief and an article that pass every check (M8a), for the check and pipeline tests.
import type { Brief } from '../../functions/_shared/articles/brief.ts';

const WORDS = ['steady', 'practice', 'builds', 'calm', 'strength', 'over', 'many', 'weeks', 'while', 'rest', 'keeps',
  'the', 'body', 'ready', 'for', 'more', 'work', 'and', 'small', 'gains', 'stack', 'into', 'real', 'change'];

/** A paragraph of n words, different for each seed, with no run that appears in the excerpts. */
export function paragraph(seed: number, n = 90): string {
  return `${Array.from({ length: n }, (_, i) => WORDS[(i * 7 + seed) % WORDS.length]).join(' ')}.`;
}

export const BRIEF: Brief = {
  sources: [
    { id: 1, url: 'https://a.org/sleep', title: 'Sleep cycles' },
    { id: 2, url: 'https://b.org/rest', title: 'Rest and recovery' },
    { id: 3, url: 'https://c.org/training', title: 'Training' },
  ],
  facts: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, text: `Fact ${i + 1} about sleep and training.`, sources: [(i % 3) + 1] })),
  excerpts: ['A typical night has four to six cycles of about ninety minutes.', 'Muscles adapt during the rest between sessions.'],
};

/** The model's JSON for an article of 5 sections × 2 paragraphs × 90 words (900 words). */
export function articleJson(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: 'Why rest makes you stronger',
    summary: 'Training breaks the body down a little; rest is when it builds back stronger.',
    sections: [0, 1, 2, 3, 4].map((i) => ({
      heading: `Part ${i + 1}`,
      paragraphs: [paragraph(i * 2), paragraph(i * 2 + 1)],
      system_note: i === 2 ? 'System: Rest days count. They are part of training.' : null,
      source_ids: i < 3 ? [i + 1] : [],
    })),
    takeaways: ['Plan one full rest day this week.', 'Sleep is part of the training plan.'],
    reflection_question: 'Which day this week will you rest on purpose?',
    ...overrides,
  };
}

/** M14: the deck writer's JSON for a story lesson that passes every check against the fixture article. */
export function storyDeckJson(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: 'Rest builds you',
    subtitle: 'Why the days off are part of training',
    cast: 'jonah',
    story: [
      'Jonah runs every evening for a week. By Saturday his legs feel heavy, and the hill near the depot feels steeper than ever.',
      'He decides to push harder. On Sunday he runs again, and halfway up the hill he has to stop and walk, breathing hard.',
      'His friend Sam asks when he last took a day off. Jonah laughs. "Days off are for people who are not trying," he says.',
      'That week he tries it anyway: a run, a rest day, a run. On the rest day he walks to the shop and goes to bed early.',
      'By the next Saturday the hill is still hard. But he climbs it without stopping, and his legs feel like his own again.',
    ],
    why: {
      head: 'Rest is part of the work.',
      text: 'Training asks the body to change, and much of that change is made while you rest and sleep. Skipping rest skips the building part of the work.',
    },
    check: {
      question: 'Jonah feels slower after a hard week. What helps most?',
      options: ['Run twice as far tomorrow', 'Take a rest day, then run again', 'Stop running for good'],
      answer: 1,
      why: 'Rest gives the body time to rebuild, so the next run goes better.',
    },
    lesson: 'Rest is when training turns into strength.',
    try_today: 'Pick one rest day this week and write it in your plan.',
    ...overrides,
  };
}
