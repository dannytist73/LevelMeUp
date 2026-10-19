// The Story Deck's cards, in the order the reader swipes them (M11 decisions 5–6). Since M14 (plan
// 2026-10-19-m14-story-lessons.md) a deck is a story lesson: the cover, the story about one of the regulars, why it
// works, the quick check, the lesson with one thing to try today, then Your turn. A deck stored before M14 keeps its
// own cards: the cover, the story cards (the last one carries the System's note), the lesson, then Your turn.
import { castMember } from '@levelmeup/content';
import type { CastMember } from '@levelmeup/content';
import type { ArticleDeck, LegacyDeck, StoryDeck } from '../../../../supabase/functions/_shared/articles/deck.ts';

export type { ArticleDeck, LegacyDeck, StoryDeck };

const filled = (s: unknown): s is string => typeof s === 'string' && s.trim() !== '';
const texts = (v: unknown, min: number, max: number): v is string[] =>
  Array.isArray(v) && v.length >= min && v.length <= max && v.every(filled);

export const isStory = (d: ArticleDeck): d is StoryDeck => 'v' in d && d.v === 2;

/**
 * The deck as the server sent it, or null when its shape isn't one this phone knows (a later server's, a hand edit, a
 * regular this build hasn't met): the phone then shows the full article, and no card is drawn with a piece missing
 * (M11 review).
 */
export function asDeck(value: unknown): ArticleDeck | null {
  if (typeof value !== 'object' || value === null) return null;
  const d = value as Record<string, unknown>;
  if (!filled(d.lesson) || !filled(d.tryToday)) return null;
  if ('v' in d) return d.v === 2 ? asStory(d) : null;
  if (!Array.isArray(d.story) || d.story.length < 1 || d.story.length > 5) return null;
  if (d.systemNote !== undefined && d.systemNote !== null && !filled(d.systemNote)) return null;
  const story: LegacyDeck['story'] = [];
  for (const card of d.story as unknown[]) {
    if (typeof card !== 'object' || card === null) return null;
    const { kicker, text } = card as Record<string, unknown>;
    if (!filled(kicker) || !filled(text)) return null;
    story.push({ kicker, text });
  }
  return { story, systemNote: typeof d.systemNote === 'string' ? d.systemNote : null, lesson: d.lesson as string, tryToday: d.tryToday as string };
}

/**
 * Whether a held article already has its story lesson. M14: since every deck on the server is now a story, a body held
 * with an older deck (or none) is asked for again, so a phone that read the article before the stories were written
 * gets them (found on the emulator: the old cards stayed, because a body with any deck counted as held).
 */
export function hasStoryDeck(value: unknown): boolean {
  const deck = asDeck(value);
  return deck !== null && isStory(deck);
}

function asStory(d: Record<string, unknown>): StoryDeck | null {
  const { title, subtitle, cast, story, why, check } = d;
  if (!filled(title) || !filled(subtitle) || typeof cast !== 'string' || castMember(cast) === undefined || !texts(story, 1, 8)) return null;
  if (typeof why !== 'object' || why === null || typeof check !== 'object' || check === null) return null;
  const w = why as Record<string, unknown>;
  const c = check as Record<string, unknown>;
  if (!filled(w.head) || !filled(w.text) || !filled(c.question) || !texts(c.options, 2, 4) || !filled(c.why)) return null;
  if (typeof c.answer !== 'number' || !Number.isInteger(c.answer) || c.answer < 0 || c.answer >= c.options.length) return null;
  return {
    v: 2, title, subtitle, cast: castMember(cast)!.id, story,
    why: { head: w.head, text: w.text },
    check: { question: c.question, options: c.options, answer: c.answer, why: c.why },
    lesson: d.lesson as string, tryToday: d.tryToday as string,
  };
}

export type Card =
  | { kind: 'cover' }
  | { kind: 'story'; i: number; kicker: string | null; text: string; note: string | null }
  | { kind: 'why' }
  | { kind: 'check' }
  | { kind: 'lesson' }
  | { kind: 'turn' };

export function deckCards(deck: ArticleDeck): Card[] {
  if (isStory(deck)) {
    return [
      { kind: 'cover' },
      ...deck.story.map((text, i) => ({ kind: 'story' as const, i, kicker: null, text, note: null })),
      { kind: 'why' },
      { kind: 'check' },
      { kind: 'lesson' },
      { kind: 'turn' },
    ];
  }
  const last = deck.story.length - 1;
  return [
    { kind: 'cover' },
    ...deck.story.map((c, i) => ({ kind: 'story' as const, i, kicker: c.kicker, text: c.text, note: i === last ? deck.systemNote : null })),
    { kind: 'lesson' },
    { kind: 'turn' },
  ];
}

/** The regular a story lesson follows, or null for a deck from before M14. */
export function deckPerson(deck: ArticleDeck): CastMember | null {
  return isStory(deck) ? castMember(deck.cast) ?? null : null;
}

/**
 * The cover's title and subtitle: a story lesson's own; else the article's title split at its colon ("Rest Between
 * Sets: The Pause That Builds Strength"), and a title without a colon has none.
 */
export function coverTitle(title: string, deck?: ArticleDeck): { title: string; subtitle: string | null } {
  if (deck !== undefined && isStory(deck)) return { title: deck.title, subtitle: deck.subtitle };
  const at = title.indexOf(': ');
  return at <= 0 ? { title, subtitle: null } : { title: title.slice(0, at), subtitle: title.slice(at + 2) };
}

/** About how long the deck takes: its words at 150 a minute, plus a minute for your line. */
export function deckMinutes(deck: ArticleDeck): number {
  const parts = isStory(deck)
    ? [...deck.story, deck.why.head, deck.why.text, deck.check.question, ...deck.check.options, deck.check.why, deck.lesson, deck.tryToday]
    : [...deck.story.map((c) => c.text), deck.systemNote ?? '', deck.lesson, deck.tryToday];
  const words = parts.join(' ').split(/\s+/).filter((w) => w !== '').length;
  return Math.ceil(words / 150) + 1;
}
