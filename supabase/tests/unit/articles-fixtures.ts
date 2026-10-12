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
