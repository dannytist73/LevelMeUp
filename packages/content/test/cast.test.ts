import { describe, expect, it } from 'vitest';
import { CAST, CAST_IDS, castMember } from '../src/cast.ts';
import { lintText } from '../src/lint.ts';
import { READING_TEXT } from '../src/reading.ts';

describe('the regulars (M14)', () => {
  it('are six people with their own ids and names, each with an age and a life, and topics to cover', () => {
    expect(CAST).toHaveLength(6);
    expect(new Set(CAST_IDS).size).toBe(6);
    expect(new Set(CAST.map((c) => c.name)).size).toBe(6);
    for (const c of CAST) {
      expect(c.id).toMatch(/^[a-z]+$/);
      expect(c.line).toMatch(/^\d{2}, /);
      expect(c.topics.split(', ').length).toBeGreaterThanOrEqual(3);
    }
  });

  it('pass the lint', () => {
    for (const c of CAST) for (const text of [c.name, c.line, c.topics]) expect(lintText(text), text).toEqual([]);
  });

  it('are found by id, and an id this build does not know finds no one', () => {
    expect(castMember('tomas')).toMatchObject({ name: 'Tomás' });
    expect(castMember('gandalf')).toBeUndefined();
  });

  it('are said to be made up wherever their story is told', () => {
    expect(READING_TEXT.deck.madeUp).toMatch(/^\{name\} is made up\. The research is real/);
  });
});
