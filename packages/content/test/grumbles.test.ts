import { describe, expect, it } from 'vitest';
import { TRAINABLE_STATS } from '../../rules/src/index.ts';
import { GRUMBLES, GRUMBLE_ROSTER, MONSTER_TEXT, WEAKNESS_TEXT, grumbleById } from '../src/grumbles.ts';
import { lintText } from '../src/lint.ts';

/** Every string in a nested text object. */
const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : typeof value === 'object' && value !== null ? Object.values(value).flatMap(strings) : [];

describe('the Grumbles (Monster Week)', () => {
  it('are 24, each id once, six per trainable stat', () => {
    expect(GRUMBLES).toHaveLength(24);
    expect(new Set(GRUMBLES.map((g) => g.id)).size).toBe(24);
    for (const stat of TRAINABLE_STATS) expect(GRUMBLES.filter((g) => g.weakness === stat), stat).toHaveLength(6);
  });

  it('take turns by stat, so every class meets its main stat in the first four battles', () => {
    for (let i = 0; i < GRUMBLES.length; i += 4) {
      expect(new Set(GRUMBLES.slice(i, i + 4).map((g) => g.weakness)).size, `from ${i}`).toBe(4);
    }
    expect(GRUMBLES[0]!.id).toBe('snoozle');
  });

  it("give the rules their roster in arrival order", () => {
    expect(GRUMBLE_ROSTER).toEqual(GRUMBLES.map((g) => ({ id: g.id, weakness: g.weakness })));
    expect(grumbleById('scrollo')?.name).toBe('Scrollo');
    expect(grumbleById('nobody')).toBeUndefined();
  });

  it('have short names and lines that fit a speech bubble, and ids safe for file names', () => {
    for (const g of GRUMBLES) {
      expect(g.id).toMatch(/^[a-z]+$/);
      expect(g.name.length, g.id).toBeLessThanOrEqual(14);
      for (const text of [g.standsFor, g.line, g.joined, g.hint]) {
        expect(text.length, `${g.id}: ${text}`).toBeGreaterThan(0);
        expect(text.length, `${g.id}: ${text}`).toBeLessThanOrEqual(40);
      }
    }
  });

  it('pass the lint: no shaming, no robotic phrases, no emoji', () => {
    const texts = [...GRUMBLES.flatMap((g) => [g.name, g.standsFor, g.line, g.joined, g.hint]), ...strings(MONSTER_TEXT), ...strings(WEAKNESS_TEXT)];
    for (const text of texts) expect(lintText(text), text).toEqual([]);
  });
});
