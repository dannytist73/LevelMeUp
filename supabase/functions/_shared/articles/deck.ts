// The Story Deck (M11 decisions 4–5), told as a story since M14 (plan 2026-10-19-m14-story-lessons.md): a finished
// article becomes a short story about one of the regulars (packages/content cast.ts), then why it works, an optional
// quick check, the lesson and one thing to try today. Written by one direct Claude call from the stored article (never
// from new research), then checked by code like the article: lengths, the lint, no copied run from a source, no
// research in the story (it is fiction, and the phone says so), and no number on the other cards that the article
// doesn't print. "Your turn" (the article's question) comes from the article itself.
import { CAST, CAST_IDS } from '../../../../packages/content/src/index.ts';
import type { CastId } from '../../../../packages/content/src/index.ts';
import { isObject } from '../http.ts';
import { ARTICLE_MODEL } from '../prompts/articles.ts';
import { HOUSE_STYLE } from '../prompts/style.ts';
import type { ArticleDraft } from './check.ts';
import { articleTexts, copyProblems, textProblems } from './check.ts';
import { clip } from './text.ts';

/** M11's deck: still stored for an article until its story is written, and still shown by the phone. */
export type DeckCard = { kicker: string; text: string };
export type LegacyDeck = { story: DeckCard[]; systemNote: string | null; lesson: string; tryToday: string };
/** M14: the story lesson. */
export type StoryDeck = {
  v: 2;
  title: string;
  subtitle: string;
  cast: CastId;
  story: string[];
  why: { head: string; text: string };
  check: { question: string; options: string[]; answer: number; why: string };
  lesson: string;
  tryToday: string;
  /**
   * The story's picture in the public `lmu-art` bucket (`story-clay/article-9.webp`, Monster Buddy): made in the owner's ComfyUI
   * (scripts/art/story-art.py) and added by the owner after the upload, or by lmu-articles-studio for the daily
   * studio's articles (M15); never by the writer.
   */
  picture?: string;
  /**
   * A picture on every story card (owner, 2026-10-26): one per card of `story`, `story-clay/article-9-1.webp` (cards from 1),
   * null for a card without one. Made and added like the picture, never by the writer.
   */
  scenes?: (string | null)[];
  /** The Grumble the story is about (packages/content's GRUMBLES), shown on the cards after the story; added like the picture. */
  grumble?: string;
};
export type ArticleDeck = LegacyDeck | StoryDeck;

export const isStoryDeck = (d: ArticleDeck): d is StoryDeck => 'v' in d && d.v === 2;

export const DECK_LIMITS = {
  minCards: 4, maxCards: 6, options: 3,
  title: [2, 40], subtitle: [10, 80], story: [60, 260], whyHead: [8, 60], whyText: [80, 380],
  question: [15, 120], option: [3, 70], checkWhy: [20, 160], lesson: [15, 140], tryToday: [20, 200],
} as const;

/** Research has no place in the story: it is fiction, and the why card carries the evidence (decision 2). */
export const STORY_RESEARCH = /\b(stud(?:y|ies|ied)|research(?:ers?)?|scientists?|experiments?|surveys?|percent|meta-analys[ie]s|participants|professor|psychologists?)\b|%/i;

const text = (description: string) => ({ type: 'string', description }) as const;

/** The deck writer's answer. Lengths are in the descriptions: the API's schemas take no length limits. */
export const DECK_SCHEMA = {
  type: 'object',
  properties: {
    title: text('The lesson\'s short title in sentence case, 1 to 4 words: the idea, not the article\'s headline (for example: Small wins).'),
    subtitle: text('One line under the title saying what the reader will take away, 4 to 12 words.'),
    cast: { type: 'string', enum: [...CAST_IDS], description: 'Who the story is about: the regular whose life fits the article best.' },
    story: {
      type: 'array',
      description: '4 to 6 story cards, in the order the reader swipes them.',
      items: text('1 to 3 short sentences of the story, 12 to 45 words.'),
    },
    why: {
      type: 'object',
      properties: {
        head: text('The idea in a few words, under 10 words, ending with a full stop.'),
        text: text('What the article\'s research found, in 2 or 3 plain sentences, 20 to 60 words.'),
      },
      required: ['head', 'text'],
      additionalProperties: false,
    },
    check: {
      type: 'object',
      properties: {
        question: text('One question about using the idea, under 20 words, ending with a question mark.'),
        options: { type: 'array', description: 'Exactly 3 short answers, 3 to 10 words each.', items: text('One answer.') },
        answer: { type: 'integer', description: 'The index of the right answer: 0, 1 or 2.' },
        why: text('One line saying why the right answer is right, under 25 words.'),
      },
      required: ['question', 'options', 'answer', 'why'],
      additionalProperties: false,
    },
    lesson: text('The article\'s main idea as one sentence, under 20 words.'),
    try_today: text('One small, safe thing the reader can try today, taken from the article\'s practical advice, under 30 words.'),
  },
  required: ['title', 'subtitle', 'cast', 'story', 'why', 'check', 'lesson', 'try_today'],
  additionalProperties: false,
} as const;

const REGULARS = CAST.map((c) => `- ${c.id}: ${c.name}, ${c.line}. Stories about ${c.topics}.`).join('\n');

export const DECK_SYSTEM = `You turn one finished LevelMeUp article into its story lesson: a short story the reader swipes through on a phone, then why it works, a quick check and the lesson. About three minutes in all.

The story:
- It stars one of the regulars listed below: the one whose life fits the article best. Keep their name, age and life as given. Small everyday details are welcome (a place, a time of day, a friend, a colleague), but never a new job or family that contradicts their line.
- 4 to 6 cards, in order: the moment (a scene the reader can picture, with a problem they would recognise), what goes wrong or what they try first, the turn (they try the article's idea in a small, concrete way), and how it goes. End on a quiet, honest result, never a miracle.
- Present tense, third person, short sentences, everyday words. Show, don't tell: actions, objects, a few words said aloud. Short lines of dialogue from the regulars are fine, and are the one exception to the house style's rule on quotation marks.
- The story is fiction and carries no research: no numbers written as digits, no studies, research, researchers, scientists, experiments, surveys, percentages or participants, and no real people. Counts written as words are fine when they belong to the scene (three weeks, the fifth Sunday).
- The story shows the article's idea working the way the article says it works, and no stronger. When the article says an effect is modest or depends on something, the story's result is modest too.

Why it works:
- The head is the idea in a few words. The text says what the article's research found, in 2 or 3 plain sentences: who looked at what, and what they found. Use only what the article says, keep every number with the study and the outcome it belongs to, and keep the article's cautions about how strong the evidence is.

The quick check:
- One question about using the idea, ideally about the story's person in a new moment. Three short answers: exactly one is right by the article; the other two are tempting but wrong, never silly. Put the right answer first, second or third as fits. The why is one line saying why the right answer is right.

The lesson and try today:
- The lesson is the article's main idea in one sentence. "Try today" is one small, safe action from the article's practical advice, sized for a beginner.

Never: facts, numbers, names, studies or examples that are not in the article (the story's fiction aside); anything announced in the game (no quest added or active, no XP, rewards or achievements); a claim to have detected something about the reader; a System note (the lesson has none).

Everything else in the house style below holds, except its shape: the lesson replaces that.

The regulars:
${REGULARS}

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
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === 'string');

/** The model's JSON as a story deck, or null when its shape is wrong (types only: the checks judge the content). */
export function parseDeck(value: unknown): StoryDeck | null {
  if (!isObject(value)) return null;
  const { title, subtitle, cast, story, why, check, lesson, try_today: tryToday } = value;
  if (typeof title !== 'string' || typeof subtitle !== 'string' || typeof lesson !== 'string' || typeof tryToday !== 'string') return null;
  if (typeof cast !== 'string' || !(CAST_IDS as readonly string[]).includes(cast) || !strings(story)) return null;
  if (!isObject(why) || typeof why.head !== 'string' || typeof why.text !== 'string') return null;
  if (!isObject(check) || typeof check.question !== 'string' || !strings(check.options) || typeof check.why !== 'string') return null;
  if (typeof check.answer !== 'number' || !Number.isInteger(check.answer)) return null;
  return {
    v: 2, title: tidy(title), subtitle: tidy(subtitle), cast: cast as CastId, story: story.map(tidy),
    why: { head: tidy(why.head), text: tidy(why.text) },
    check: { question: tidy(check.question), options: check.options.map(tidy), answer: check.answer, why: tidy(check.why) },
    lesson: tidy(lesson), tryToday: tidy(tryToday),
  };
}

/** Every piece of text the deck shows. */
export function deckTexts(d: StoryDeck): string[] {
  return [...d.story, ...factTexts(d)];
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
export function checkDeck(d: StoryDeck, article: ArticleDraft, excerpts: readonly string[]): string[] {
  const problems: string[] = [];
  const L = DECK_LIMITS;
  const size = (s: string, range: readonly [number, number], what: string) => {
    if (!between(s, range)) problems.push(`${what} must be ${range[0]}–${range[1]} characters`);
  };
  size(d.title, L.title, 'the title');
  size(d.subtitle, L.subtitle, 'the subtitle');
  if (d.story.length < L.minCards || d.story.length > L.maxCards) problems.push(`a story has ${L.minCards}–${L.maxCards} cards`);
  for (const card of d.story) {
    size(card, L.story, `story card "${clip(card, 40)}"`);
    if (/\d/.test(card)) problems.push(`story card "${clip(card, 40)}" has a number in digits (the story is fiction)`);
    const research = STORY_RESEARCH.exec(card);
    if (research !== null) problems.push(`story card "${clip(card, 40)}" mentions research ("${research[0]}"): that belongs on the why card`);
  }
  const name = CAST.find((c) => c.id === d.cast)!.name;
  if (!d.story.some((card) => card.includes(name))) problems.push(`the story never names ${name}`);
  size(d.why.head, L.whyHead, 'the why card\'s head');
  size(d.why.text, L.whyText, 'the why card\'s text');
  size(d.check.question, L.question, 'the question');
  if (!d.check.question.endsWith('?')) problems.push('the question must end with a question mark');
  if (d.check.options.length !== L.options) problems.push(`the quick check has exactly ${L.options} answers`);
  for (const o of d.check.options) size(o, L.option, `the answer "${clip(o, 30)}"`);
  if (new Set(d.check.options.map((o) => o.toLowerCase())).size !== d.check.options.length) problems.push('the answers must differ');
  if (d.check.answer < 0 || d.check.answer >= d.check.options.length) problems.push('the right answer must be one of the answers');
  size(d.check.why, L.checkWhy, 'the answer\'s why');
  size(d.lesson, L.lesson, 'the lesson');
  size(d.tryToday, L.tryToday, '"Try today"');

  // The regulars may speak in the story (decision 2): a story's quotation marks are dialogue, not a quoted source.
  for (const card of d.story) problems.push(...textProblems(card).filter((p) => !p.startsWith('no quotations')));
  const facts = factTexts(d);
  for (const t of facts) problems.push(...textProblems(t));
  problems.push(...copyProblems(deckTexts(d), excerpts));
  // No invented statistics: every number off the story's cards is one the article prints. The story's counts are its own.
  const known = new Set(articleTexts(article).flatMap(numbersIn));
  for (const n of new Set(facts.flatMap(numbersIn))) if (!known.has(n)) problems.push(`the number ${n} is not in the article`);
  return [...new Set(problems)];
}

/** Every text off the story's cards: these speak as fact, so they hold to the article. */
function factTexts(d: StoryDeck): string[] {
  return [d.title, d.subtitle, d.why.head, d.why.text, d.check.question, ...d.check.options, d.check.why, d.lesson, d.tryToday];
}
