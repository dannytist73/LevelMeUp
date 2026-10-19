// A sample article in the shape lmu-sync sends (M8b): the development reading screen and the tests read it. Not
// player content: it never reaches a quest day.
import type { ArticleBody } from '../game/types.ts';
import type { LegacyDeck, StoryDeck } from '../reading/deck.ts';

/** M11: its Story Deck as the tick stored it before M14 (only the article's own facts and numbers). */
export const SAMPLE_LEGACY_DECK: LegacyDeck = {
  story: [
    { kicker: 'The story', text: 'One push-up proves very little. But each small promise you keep is a piece of evidence about who you are.' },
    { kicker: 'What is really happening', text: 'Big efforts depend on mood; small ones survive bad days. Repeating something in the same setting matters more than how hard you go.' },
    { kicker: 'How long it takes', text: 'On average it takes about 66 days for a habit to feel automatic. Thirty days of small wins already make a case your mind finds hard to argue with.' },
  ],
  systemNote: 'A streak is exactly this: evidence, one day at a time.',
  lesson: 'Small promises kept are evidence about who you are.',
  tryToday: 'Pick one win so small it survives your worst day, and tick it off tonight.',
};

/** M14: the same article told as a story lesson, in the shape the tick stores now. */
export const SAMPLE_STORY_DECK: StoryDeck = {
  v: 2,
  title: 'Small promises',
  subtitle: 'Why tiny wins change how you see yourself',
  cast: 'amara',
  story: [
    "Amara promises herself she will study two hours every night. By Wednesday she has done none, and the promise feels like proof she can't.",
    'On Thursday she makes a smaller one: open the notes and read one page. She does it in the bus queue, before she can talk herself out of it.',
    'Friday, one page again. Saturday, two. None of it feels like much, but each night she keeps the promise she made that morning.',
    'Three weeks later the page has become a habit. The exam is still hard, but Amara no longer wonders whether she is someone who studies.',
  ],
  why: {
    head: 'Small wins are evidence.',
    text: 'Big efforts depend on mood, while small ones survive bad days. Repeating something in the same setting matters more than how hard you go, and on average a habit takes about 66 days to feel automatic.',
  },
  check: {
    question: 'Amara missed her study plan again. What should she try next?',
    options: ['A smaller promise she can keep tonight', 'A longer session to catch up', 'Wait for a day she feels motivated'],
    answer: 0,
    why: 'A promise small enough to keep on a bad day gives her evidence she can count on.',
  },
  lesson: 'Small promises kept are evidence about who you are.',
  tryToday: 'Pick one win so small it survives your worst day, and tick it off tonight.',
};

export const SAMPLE_ARTICLE: ArticleBody = {
  id: 'article-0',
  cluster: 'habits',
  title: 'Why tiny wins change how you see yourself',
  minutes: 6,
  summary: 'Most people try to change what they do. The stubborn ones change who they think they are, and the doing follows.',
  sections: [
    {
      heading: 'Every rep is a vote',
      paragraphs: [
        'Each time you keep a small promise, you collect evidence about yourself. One push-up proves very little. Thirty days of them make a case your own mind finds hard to argue with.',
      ],
      systemNote: 'A streak is exactly this: evidence, one day at a time.',
      sources: [1],
    },
    {
      heading: 'Small beats heroic',
      paragraphs: [
        'Big efforts depend on mood. Small ones survive bad days. Studies of habit suggest that repeating something in the same setting matters more than how hard you go: it takes ≈ 66 days on average for a habit to feel automatic.',
      ],
      systemNote: null,
      sources: [1, 2],
    },
    {
      heading: 'Make the win visible',
      paragraphs: [
        'A win you can see is a win you remember. Tick it, log it, say it out loud. The mathematician Paul Erdős kept notebooks of problems he had solved, and went back to them for courage.',
      ],
      systemNote: null,
      sources: [2],
    },
  ],
  takeaways: ['Small promises kept are evidence about who you are.', 'Choose wins that survive your worst day.', 'Make every win visible.'],
  question: "What's one small win from this week you didn't count?",
  sources: [
    { n: 1, title: 'How are habits formed', url: 'https://example.org/habits', host: 'example.org' },
    { n: 2, title: 'Small wins and motivation', url: 'https://www.example.com/small-wins', host: 'example.com' },
  ],
  deck: SAMPLE_LEGACY_DECK,
};

/** M14: the sample article with its story lesson. */
export const SAMPLE_STORY_ARTICLE: ArticleBody = { ...SAMPLE_ARTICLE, deck: SAMPLE_STORY_DECK };
