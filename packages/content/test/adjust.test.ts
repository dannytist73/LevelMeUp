import { describe, expect, it } from 'vitest';
import { ABILITY_IDS } from '../../rules/src/index.ts';
import { ABILITY_LINES, ADJUST_TEXT, pausedName } from '../src/adjust.ts';
import { LIBRARY, authoredTemplate } from '../src/library.ts';
import { lintText } from '../src/lint.ts';
import { LADDER_NAMES } from '../src/names.ts';
import { fillText } from '../src/play.ts';

const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : typeof value === 'object' && value !== null ? Object.values(value).flatMap(strings) : [];

describe('the words of adjusting the day (M6b)', () => {
  it('pass the lint: plain, kind, no shaming', () => {
    const all = [...strings(ADJUST_TEXT), ...Object.values(ABILITY_LINES), ...Object.values(LADDER_NAMES)];
    expect(all.length).toBeGreaterThan(60);
    for (const text of all) expect(lintText(text), text).toEqual([]);
  });

  it('every ability has a line and every ladder a name', () => {
    expect(Object.keys(ABILITY_LINES).sort()).toEqual([...ABILITY_IDS].sort());
    expect(Object.keys(LADDER_NAMES).sort()).toEqual(LIBRARY.ladders.map((l) => l.id).sort());
  });

  it('names what rests after pain: a ladder, or a standalone quest by its own name', () => {
    expect(pausedName('push')).toBe('Push-ups');
    expect(pausedName('micro-squats')).toBe(authoredTemplate('micro-squats').name);
    expect(pausedName('retired-quest')).toBe('retired-quest');
  });

  it('fill their placeholders', () => {
    expect(fillText(ADJUST_TEXT.day.swap, { left: 1 })).toBe('Swap · 1 left');
    expect(fillText(ADJUST_TEXT.pain.persists, { count: 2 })).toContain('2 times');
    expect(fillText(ADJUST_TEXT.classChange.locked, { date: 'Sat 24 Oct' })).toContain('Sat 24 Oct');
    expect(fillText(ADJUST_TEXT.vanish.done, { n: 60 })).toBe('You vanished for 60 minutes.');
  });
});
