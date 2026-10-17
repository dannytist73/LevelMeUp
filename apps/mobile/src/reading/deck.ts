// The Story Deck's cards, in the order the reader swipes them (M11 decisions 5–6): the cover (the title), the story
// cards (the last one carries the System's note), the lesson with one thing to try today, then Your turn.
import type { ArticleDeck } from '../../../../supabase/functions/_shared/articles/deck.ts';

export type { ArticleDeck };

const filled = (s: unknown): s is string => typeof s === 'string' && s.trim() !== '';

/**
 * The deck as the server sent it, or null when its shape isn't one this phone knows (a later server's, a hand edit):
 * the phone then shows the full article, and no card is drawn with a piece missing (M11 review).
 */
export function asDeck(value: unknown): ArticleDeck | null {
  if (typeof value !== 'object' || value === null) return null;
  const d = value as Record<string, unknown>;
  if (!Array.isArray(d.story) || d.story.length < 1 || d.story.length > 5) return null;
  if (!filled(d.lesson) || !filled(d.tryToday)) return null;
  if (d.systemNote !== undefined && d.systemNote !== null && !filled(d.systemNote)) return null;
  const story: ArticleDeck['story'] = [];
  for (const card of d.story as unknown[]) {
    if (typeof card !== 'object' || card === null) return null;
    const { kicker, text } = card as Record<string, unknown>;
    if (!filled(kicker) || !filled(text)) return null;
    story.push({ kicker, text });
  }
  return { story, systemNote: typeof d.systemNote === 'string' ? d.systemNote : null, lesson: d.lesson, tryToday: d.tryToday };
}

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
