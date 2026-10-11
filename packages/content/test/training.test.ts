import { describe, expect, it } from 'vitest';
import { EQUIPMENT, LIMITATIONS, MOVE_PATTERNS, MOVE_SLOTS, PROGRAM_STYLES } from '../../rules/src/index.ts';
import { lintText } from '../src/lint.ts';
import { MOVES, authoredMove, progressLine } from '../src/training/moves.ts';
import { PROGRAMS } from '../src/training/programs.ts';

describe('the exercise library (M6c decision 3)', () => {
  it('has 53 moves with unique ids and names', () => {
    expect(MOVES).toHaveLength(53);
    expect(new Set(MOVES.map((m) => m.id)).size).toBe(MOVES.length);
    expect(new Set(MOVES.map((m) => m.name)).size).toBe(MOVES.length);
    for (const m of MOVES) expect(m.id).toMatch(/^[a-z0-9-]{1,40}$/);
  });

  it('every move is well formed', () => {
    for (const m of MOVES) {
      expect(m.slots.length, m.id).toBeGreaterThan(0);
      for (const s of m.slots) expect(MOVE_SLOTS, m.id).toContain(s);
      expect(MOVE_PATTERNS, m.id).toContain(m.pattern);
      for (const e of m.needs) expect(EQUIPMENT, m.id).toContain(e);
      for (const c of m.contraindications) expect(LIMITATIONS, m.id).toContain(c);
      expect([1, 2, 3], m.id).toContain(m.level);
      expect(Number.isInteger(m.min) && Number.isInteger(m.max) && m.min >= 3 && m.min < m.max && m.max <= 60, m.id).toBe(true);
      expect(m.steps.length, m.id).toBeGreaterThanOrEqual(2);
      expect(m.steps.length, m.id).toBeLessThanOrEqual(3);
      expect(m.cue.length, m.id).toBeGreaterThan(10);
    }
  });

  it('every barbell lift is level 3 and says to learn it light', () => {
    for (const m of MOVES.filter((x) => x.id.startsWith('barbell-'))) {
      expect(m.level, m.id).toBe(3);
      expect(m.cue, m.id).toMatch(/light bar first/);
    }
  });

  it('nothing tells the player to go to failure, and the words pass the lint', () => {
    for (const m of MOVES) {
      for (const text of [m.name, ...m.steps, m.cue, progressLine(m)]) {
        expect(lintText(text), `${m.id}: ${text}`).toEqual([]);
        expect(text.toLowerCase(), m.id).not.toMatch(/failure|to fail|max out|all-out/);
      }
    }
  });

  it('the progress line follows the kind of move', () => {
    expect(progressLine(authoredMove('plank'))).toMatch(/hold a few seconds longer/);
    expect(progressLine(authoredMove('band-row'))).toMatch(/stronger band/);
    expect(progressLine(authoredMove('goblet-squat'))).toMatch(/heavier/);
    expect(progressLine(authoredMove('push-up'))).toMatch(/lower more slowly/);
    expect(() => authoredMove('kettlebell-swing')).toThrow(RangeError);
  });
});

describe('the programs (decision 4)', () => {
  it('Men\'s and Women\'s have three days, No preference two, each with six slots', () => {
    for (const style of PROGRAM_STYLES) {
      expect(PROGRAMS[style]).toHaveLength(style === 'none' ? 2 : 3);
      for (const day of PROGRAMS[style]) {
        expect(day).toHaveLength(6);
        for (const slot of day) expect(MOVE_SLOTS).toContain(slot);
      }
    }
  });

  it('every slot a program uses has a move', () => {
    for (const style of PROGRAM_STYLES) {
      for (const slot of PROGRAMS[style].flat()) expect(MOVES.some((m) => m.slots.includes(slot)), slot).toBe(true);
    }
  });
});
