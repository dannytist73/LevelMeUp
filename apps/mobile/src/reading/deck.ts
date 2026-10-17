// The Story Deck's cards, in the order the reader swipes them (M11 decisions 5–6): the cover (the title), the story
// cards (the last one carries the System's note), the lesson with one thing to try today, then Your turn.
import type { ArticleDeck } from '../../../../supabase/functions/_shared/articles/deck.ts';

export type { ArticleDeck };

export type Card =
  | { kind: 'cover' }
  | { kind: 'story'; i: number; kicker: string; text: string; note: string | null }
  | { kind: 'lesson' }
  | { kind: 'turn' };

export function deckCards(deck: ArticleDeck): Card[] {
  const last = deck.story.length - 1;
  return [
    { kind: 'cover' },
    ...deck.story.map((c, i) => ({ kind: 'story' as const, i, kicker: c.kicker, text: c.text, note: i === last ? deck.systemNote : null })),
    { kind: 'lesson' },
    { kind: 'turn' },
  ];
}

/** "Rest Between Sets: The Pause That Builds Strength" → its title and subtitle; a title without a colon has none. */
export function coverTitle(title: string): { title: string; subtitle: string | null } {
  const at = title.indexOf(': ');
  return at <= 0 ? { title, subtitle: null } : { title: title.slice(0, at), subtitle: title.slice(at + 2) };
}

/** About how long the deck takes: its words at 150 a minute, plus a minute for your line. */
export function deckMinutes(deck: ArticleDeck): number {
  const words = [...deck.story.map((c) => c.text), deck.systemNote ?? '', deck.lesson, deck.tryToday]
    .join(' ').split(/\s+/).filter((w) => w !== '').length;
  return Math.ceil(words / 150) + 1;
}
