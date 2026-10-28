import { describe, expect, it } from 'vitest';
import { BASE_DAYS_OPTIONS, MOVE_SLOTS, baseDays, planDay } from '../../rules/src/index.ts';
import { BASE_TEXT, formatClock, formatSet, workoutName } from '../src/base.ts';
import { BOOKS, chapter, chapterMinutes } from '../src/books/books.ts';
import { CHAPTERS } from '../src/books/chapters.ts';
import { lintText } from '../src/lint.ts';
import { BASE_LAYOUTS, BASE_MOVES, GYM_EXTRAS } from '../src/training/base.ts';

describe('the first books', () => {
  it('use every stored story exactly once, each book 4 to 10 chapters', () => {
    const used = BOOKS.flatMap((b) => b.chapters);
    expect(new Set(used).size).toBe(used.length);
    expect([...used].sort()).toEqual(Object.keys(CHAPTERS).sort());
    for (const b of BOOKS) {
      expect(b.chapters.length, b.id).toBeGreaterThanOrEqual(3);
      expect(b.chapters.length, b.id).toBeLessThanOrEqual(10);
      expect(lintText(b.title)).toEqual([]);
      expect(lintText(b.blurb)).toEqual([]);
    }
  });
  it('every chapter has its cards and a check with a valid answer', () => {
    for (const id of Object.keys(CHAPTERS)) {
      const c = chapter(id);
      expect(c.story.length, id).toBeGreaterThanOrEqual(3);
      expect(c.check.answer, id).toBeLessThan(c.check.options.length);
      expect(chapterMinutes(c), id).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('the base training', () => {
  it('gym extras are well formed and their words pass the lint', () => {
    for (const m of GYM_EXTRAS) {
      expect(m.needs).toEqual(['gym']);
      for (const s of m.slots) expect(MOVE_SLOTS).toContain(s);
      for (const text of [m.name, ...m.steps, m.cue]) expect(lintText(text), `${m.id}: ${text}`).toEqual([]);
    }
    expect(new Set(BASE_MOVES.map((m) => m.id)).size).toBe(BASE_MOVES.length);
  });
  it('every layout plans a full workout at the gym and at home with nothing, for both plans', () => {
    for (const style of ['men', 'women'] as const) {
      for (const days of BASE_DAYS_OPTIONS) {
        const layout = baseDays(BASE_LAYOUTS, style, days);
        expect(layout).toHaveLength(days);
        for (const day of layout) {
          for (const place of ['gym', 'home'] as const) {
            for (const week of [1, 3, 5, 6]) {
              // Pulling needs a band or a bar, so a home with nothing can only fill some pull days.
              const bare = planDay({ moves: BASE_MOVES, day, blockWeek: week, place, home: [], limitations: [], experience: 'new' });
              expect(bare.length, `${style} ${days}x ${place}`).toBeGreaterThanOrEqual(2);
              const kit = planDay({ moves: BASE_MOVES, day, blockWeek: week, place, home: ['dumbbells', 'bands'], limitations: [], experience: 'new' });
              expect(kit.length, `${style} ${days}x ${place} with kit`).toBeGreaterThanOrEqual(day.length - 1);
            }
          }
          const gym = planDay({ moves: BASE_MOVES, day, blockWeek: 2, place: 'gym', home: [], limitations: [], experience: 'regular' });
          expect(gym).toHaveLength(day.length);
        }
      }
    }
  });
});

/** Every string in a copy object, with functions called on sample arguments. */
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (typeof value === 'function') {
    const fn = value as (...a: unknown[]) => unknown;
    let r: unknown;
    try {
      r = fn(3, 6, 'kg');
    } catch {
      r = fn('Lunch', 'Workout A', 6);
    }
    if (typeof r === 'string') out.push(r);
    else if (Array.isArray(r)) out.push(...r.filter((x): x is string => typeof x === 'string'));
  } else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value !== null && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out));
  return out;
}

describe('the base words', () => {
  it('pass the lint: no robotic phrases, no shaming words, no emoji, no streak talk', () => {
    const all = strings(BASE_TEXT);
    expect(all.length).toBeGreaterThan(200);
    for (const text of all) {
      expect(lintText(text), text).toEqual([]);
      expect(text.toLowerCase(), text).not.toMatch(/streak|missed|behind|you failed/);
    }
  });

  it('format sets, clocks and workout names', () => {
    expect(formatSet(62.5, 6, 'kg')).toBe('62.5 kg × 6');
    expect(formatSet(null, 12, 'kg')).toBe('12 reps');
    expect(formatSet(null, 30, 'kg', 'seconds')).toBe('30 s');
    expect(formatClock(18 * 60_000 + 42_000)).toBe('18:42');
    expect(formatClock(3_909_000)).toBe('1:05:09');
    expect(workoutName(1)).toBe('B');
    expect(BASE_TEXT.today.weekOf(2, 6)).toBe('Week 2 of 6');
    expect(BASE_TEXT.workout.finishLines(1, 1)).toBe('1 set in 1 min.');
    expect(BASE_TEXT.today.exercises(1, 5)).toBe('1 exercise, about 5 min');
  });
});
