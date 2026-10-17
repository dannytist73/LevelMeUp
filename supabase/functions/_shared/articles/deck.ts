// The Story Deck (M11 decisions 4–5): a finished article told as a few short cards the phone swipes through. Written by
// one direct Claude call from the stored article (never from new research), then checked by code like the article:
// lengths, no quotations, no links or markup, the lint, no copied run from a source, and no number the article doesn't
// have. The cover (the title) and "Your turn" (the article's question) come from the article itself.
import { isObject } from '../http.ts';
import { ARTICLE_MODEL } from '../prompts/articles.ts';
import { HOUSE_STYLE } from '../prompts/style.ts';
import type { ArticleDraft } from './check.ts';
import { GAME_WORDS, articleTexts, copyProblems, textProblems } from './check.ts';
import { clip } from './text.ts';

export type DeckCard = { kicker: string; text: string };
export type ArticleDeck = { story: DeckCard[]; systemNote: string | null; lesson: string; tryToday: string };

export const DECK_LIMITS = {
  minCards: 3, maxCards: 5,
  kicker: [2, 40], text: [80, 420], systemNote: [10, 160], lesson: [15, 140], tryToday: [20, 200],
} as const;

const text = (description: string) => ({ type: 'string', description }) as const;

/** The deck writer's answer. Lengths are in the descriptions: the API's schemas take no length limits. */
export const DECK_SCHEMA = {
  type: 'object',
  properties: {
    story: {
      type: 'array',
      description: '3 to 5 story cards, in the order the reader swipes them.',
      items: {
        type: 'object',
        properties: {
          kicker: text('2 to 5 words naming the card\'s part of the story, in sentence case (for example: The story, What is really happening, Why it matters).'),
          text: text('One idea in 1 to 3 short sentences, 15 to 70 words.'),
        },
        required: ['kicker', 'text'],
        additionalProperties: false,
      },
    },
    system_note: {
      anyOf: [text('One short line in the System\'s terse game-screen voice, under 25 words, without a "System:" prefix.'), { type: 'null' }],
      description: 'Shown on the last story card; null when the article gives the System nothing to add.',
    },
    lesson: text('The article\'s main idea as one sentence, under 20 words.'),
    try_today: text('One small, safe thing the reader can try today, taken from the article\'s practical advice, under 30 words.'),
  },
  required: ['story', 'system_note', 'lesson', 'try_today'],
  additionalProperties: false,
} as const;

export const DECK_SYSTEM = `You turn one finished LevelMeUp article into its Story Deck: a few short cards a reader swipes through on a phone in about three minutes.

Rules:
- Use only what the article says. Add no facts, numbers, names, studies, dates or examples that are not in the article, and keep every number with the study and the outcome it belongs to. This holds for numbers written as words too: "a few minutes" never becomes "five minutes".
- The story cards retell the article in its own order: open with its opening scene or question, then the key findings, then why they matter. One idea per card, 1 to 3 short sentences. Speak to the reader as "you" where the article does.
- Each card's kicker names its part of the story in a few words, in sentence case.
- The lesson is the article's main idea in one sentence. "Try today" is one small, safe action from the article's practical advice, sized for a beginner.
- A System note is optional: one terse line in the System's game-screen voice that sums up or nudges, never a new fact. It never announces anything in the game (no quest added or active, no XP, rewards or achievements) and never claims to have detected something about the reader: only the app's own quests do that.
- Everything else in the house style below holds, except its shape: the deck replaces that.

${HOUSE_STYLE}`;

/** The article as the deck writer reads it: its words, without source ids. */
export function deckInput(a: ArticleDraft): string {
  return JSON.stringify({
    title: a.title,
    summary: a.summary,
    sections: a.sections.map((s) => ({ heading: s.heading, paragraphs: s.paragraphs, system_note: s.systemNote })),
    takeaways: a.takeaways,
  });
}

/** The request for messages.create (one direct call, not a batch: one or two decks a night). */
export function deckParams(a: ArticleDraft): Record<string, unknown> {
  return {
    model: ARTICLE_MODEL,
    max_tokens: 4000,
    system: DECK_SYSTEM,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: DECK_SCHEMA } },
    messages: [{ role: 'user', content: `The article (JSON):\n${deckInput(a)}` }],
  };
}

const tidy = (s: string): string => s.replace(/\s+/g, ' ').trim();

/** The model's JSON as a deck, or null when its shape is wrong (types only: the checks judge the content). */
export function parseDeck(value: unknown): ArticleDeck | null {
  if (!isObject(value) || !Array.isArray(value.story) || typeof value.lesson !== 'string' || typeof value.try_today !== 'string') return null;
  if (value.system_note !== null && typeof value.system_note !== 'string') return null;
  const story: DeckCard[] = [];
  for (const card of value.story) {
    if (!isObject(card) || typeof card.kicker !== 'string' || typeof card.text !== 'string') return null;
    story.push({ kicker: tidy(card.kicker), text: tidy(card.text) });
  }
  // The phone's box carries the "System" label already, as for the article's notes.
  const note = typeof value.system_note === 'string' ? tidy(value.system_note).replace(/^system:\s*/i, '') : '';
  return { story, systemNote: note === '' ? null : note, lesson: tidy(value.lesson), tryToday: tidy(value.try_today) };
}

/** Every piece of text the deck shows. */
export function deckTexts(d: ArticleDeck): string[] {
  return [...d.story.flatMap((c) => [c.kicker, c.text]), ...(d.systemNote === null ? [] : [d.systemNote]), d.lesson, d.tryToday];
}

/**
 * The numbers in a text, as digits without thousands separators: "1,200", "1200" and "twelve hundred" are the same
 * number, and so are "66" and "sixty-six" (M11 review). A lone "one" or "two" is left out: as words they are too often
 * not a figure ("one small step", "the two of them").
 */
export function numbersIn(t: string): string[] {
  const digits = [...t.matchAll(/\d+(?:[.,]\d+)*/g)].map((m) => m[0].replace(/,(?=\d{3}\b)/g, ''));
  return [...digits, ...spelledNumbers(t).filter((n) => n > 2).map(String)];
}

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const SCALES: Record<string, number> = { thousand: 1_000, million: 1_000_000 };

/** Numbers written as words: "sixty-six", "three hundred and fifty", "ten thousand". A comma or any other word ends one. */
function spelledNumbers(t: string): number[] {
  const out: number[] = [];
  let total = 0;
  let current = 0;
  let last: 'none' | 'unit' | 'ten' | 'scale' = 'none';
  const flush = () => {
    if (last !== 'none') out.push(total + current);
    total = 0;
    current = 0;
    last = 'none';
  };
  for (const [, word, gap] of t.toLowerCase().matchAll(/([a-z]+)([^a-z]*)/g)) {
    const w = word!;
    const value = NUMBER_WORDS[w];
    if (value !== undefined) {
      // "twenty one" is one number; "five six" is two.
      if (last === 'unit' || (last === 'ten' && value >= 10)) flush();
      current += value;
      last = value >= 20 ? 'ten' : 'unit';
    } else if (w === 'hundred') {
      current = (current === 0 ? 1 : current) * 100;
      last = 'scale';
    } else if (w in SCALES) {
      total += (current === 0 ? 1 : current) * SCALES[w]!;
      current = 0;
      last = 'scale';
    } else if (!(w === 'and' && last === 'scale')) {
      flush();
    }
    if (!/^[\s-]*$/.test(gap!)) flush();
  }
  flush();
  return out;
}

const between = (s: string, [min, max]: readonly [number, number]): boolean => s.length >= min && s.length <= max;

/** Why a deck can't be shown with its article, or nothing. */
export function checkDeck(d: ArticleDeck, article: ArticleDraft, excerpts: readonly string[]): string[] {
  const problems: string[] = [];
  const L = DECK_LIMITS;
  if (d.story.length < L.minCards || d.story.length > L.maxCards) problems.push(`a deck has ${L.minCards}–${L.maxCards} story cards`);
  for (const c of d.story) {
    if (!between(c.kicker, L.kicker)) problems.push(`kicker "${clip(c.kicker, 40)}" must be ${L.kicker[0]}–${L.kicker[1]} characters`);
    if (!between(c.text, L.text)) problems.push(`card "${clip(c.text, 40)}" must be ${L.text[0]}–${L.text[1]} characters`);
  }
  if (d.systemNote !== null && !between(d.systemNote, L.systemNote)) problems.push(`the System note must be ${L.systemNote[0]}–${L.systemNote[1]} characters`);
  if (d.systemNote !== null && GAME_WORDS.test(d.systemNote)) problems.push('the System note announces something in the game, which only the app does');
  if (!between(d.lesson, L.lesson)) problems.push(`the lesson must be ${L.lesson[0]}–${L.lesson[1]} characters`);
  if (!between(d.tryToday, L.tryToday)) problems.push(`"Try today" must be ${L.tryToday[0]}–${L.tryToday[1]} characters`);

  const texts = deckTexts(d);
  for (const t of texts) problems.push(...textProblems(t));
  problems.push(...copyProblems(texts, excerpts));
  // No invented statistics: every number on a card is one the article prints.
  const known = new Set(articleTexts(article).flatMap(numbersIn));
  for (const n of new Set(texts.flatMap(numbersIn))) if (!known.has(n)) problems.push(`the number ${n} is not in the article`);
  return [...new Set(problems)];
}
