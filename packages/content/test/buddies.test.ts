import { describe, expect, it } from 'vitest';
import { CLASSES } from '../../rules/src/index.ts';
import { BUDDIES, BUDDY_SIZES, BUDDY_TEXT } from '../src/buddies.ts';
import { GRUMBLES } from '../src/grumbles.ts';
import { lintText } from '../src/lint.ts';
import { fillText } from '../src/play.ts';

describe('the buddies (Monster Buddy)', () => {
  it('are one per class, each named once, never a Grumble', () => {
    expect(Object.keys(BUDDIES).sort()).toEqual(Object.keys(CLASSES).sort());
    const names = Object.values(BUDDIES).map((b) => b.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(GRUMBLES.map((g) => g.name)).not.toContain(name);
  });

  it('fill every line with what the screens give', () => {
    const b = BUDDIES.warrior;
    const values = { name: b.name, kind: b.kind, className: 'Warrior', size: BUDDY_SIZES[1], level: 5, stat: 'Strength' };
    for (const text of Object.values(BUDDY_TEXT)) expect(() => fillText(text, values), text).not.toThrow();
    expect(fillText(BUDDY_TEXT.grew, values)).toBe('Pummel grew!');
  });

  it('pass the lint: no shaming, no robotic phrases, no emoji', () => {
    const texts = [...Object.values(BUDDIES).flatMap((b) => [b.name, b.kind]), ...BUDDY_SIZES, ...Object.values(BUDDY_TEXT)];
    for (const text of texts) expect(lintText(text), text).toEqual([]);
  });
});
