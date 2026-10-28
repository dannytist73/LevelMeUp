// The first books (docs/2026-10-28-base-app.md, "Read"): our stored story lessons grouped by subject and put in an
// order that builds. A book is one big idea; each chapter is one story. More books come from the 9 AM studio later.
import { CHAPTERS } from './chapters.ts';
import type { Chapter } from './chapters.ts';

export type Book = {
  id: string;
  title: string;
  /** One line on the big idea. */
  blurb: string;
  /** Chapter ids (article ids), in reading order. */
  chapters: readonly string[];
};

export const BOOKS: readonly Book[] = [
  {
    id: 'habits-that-hold',
    title: 'Habits That Hold',
    blurb: 'How to keep going on the days that usually stop you.',
    chapters: ['article-9', 'article-55', 'article-144', 'article-56', 'article-33', 'article-34'],
  },
  {
    id: 'train-smart',
    title: 'Train Smart',
    blurb: 'Why steady, planned training beats going all in.',
    chapters: ['article-36', 'article-20', 'article-28', 'article-167', 'article-27', 'article-122'],
  },
  {
    id: 'sleep-and-energy',
    title: 'Sleep and Energy',
    blurb: 'Small changes to light, coffee and naps that give you better nights.',
    chapters: ['article-21', 'article-29', 'article-37', 'article-140', 'article-143'],
  },
  {
    id: 'focus-and-learning',
    title: 'Focus and Learning',
    blurb: 'Win back your attention and learn things so they stay.',
    chapters: ['article-22', 'article-141', 'article-30', 'article-142', 'article-31', 'article-23'],
  },
  {
    id: 'a-calm-mind',
    title: 'A Calm Mind',
    blurb: 'Old ideas from Stoics and a swordsman for a steadier head.',
    chapters: ['article-24', 'article-35', 'article-32', 'article-25'],
  },
];

export function chapter(id: string): Chapter {
  const found = CHAPTERS[id];
  if (found === undefined) throw new RangeError(`unknown chapter ${id}`);
  return found;
}

export function book(id: string): Book {
  const found = BOOKS.find((b) => b.id === id);
  if (found === undefined) throw new RangeError(`unknown book ${id}`);
  return found;
}

/** A chapter's reading time in minutes: its cards at about 200 words a minute, at least 2. */
export function chapterMinutes(c: Chapter): number {
  const words = [...c.story, c.why.text, c.lesson, c.tryToday].join(' ').split(/\s+/).length;
  return Math.max(2, Math.round(words / 200));
}
