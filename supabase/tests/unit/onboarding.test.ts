import { describe, expect, it } from 'vitest';
import { LIBRARY, VOICES, lintText } from '../../../packages/content/src/index.ts';
import { isProblem } from '../../functions/_shared/http.ts';
import { parseOnboarding, parseReveal, revealFacts, startArgs, templateReveal } from '../../functions/_shared/onboarding.ts';
import { HOUR, choices } from './fixtures.ts';

const body = (over: Record<string, unknown> = {}) => ({ ...choices(), ...over });

describe('the onboarding body', () => {
  it('accepts valid choices and canonicalises the time zone', () => {
    expect(parseOnboarding(body({ name: '  Rin  ' }))).toEqual({ ...choices(), name: 'Rin' });
  });

  it.each([
    ['name', { name: '' }], ['name', { name: 'x'.repeat(41) }], ['name', { name: 'a\u0000b' }],
    ['voice', { voice: 'pirate' }],
    ['goals', { goals: [] }], ['goals', { goals: ['body', 'focus', 'learn'] }], ['goals', { goals: ['body', 'body'] }], ['goals', { goals: ['wealth'] }],
    ['classId', { classId: 'paladin' }], ['classId', { classId: '__proto__' }],
    ['estimates', { estimates: { strength: 5 } }], ['estimates', { estimates: { strength: 5, vitality: 5, wisdom: 5, focus: 5, discipline: Number.NaN } }],
    ['minutesPerDay', { minutesPerDay: 30 }],
    ['difficulty', { difficulty: 'nightmare' }],
    ['boundaryMinutes', { boundaryMinutes: 1440 }], ['boundaryMinutes', { boundaryMinutes: 1.5 }],
    ['timeZone', { timeZone: 'Mars/Base' }],
    ['limitations', { limitations: ['neck'] }],
    ['gentleStart', { gentleStart: 'yes' }],
  ])('rejects a bad %s', (field, over) => {
    expect(parseOnboarding(body(over))).toEqual({ status: 400, code: 'bad_field', detail: field });
  });

  it('refuses a body that is not an object', () => {
    expect(isProblem(parseOnboarding([]))).toBe(true);
  });
});

describe('the start of a character', () => {
  const nightOwl = Date.UTC(2026, 9, 10, 17, 30); // 1:30 AM in Manila

  it('clamps estimates to 3–8 and adds the class bonus (players cannot start strong by typing big numbers)', () => {
    const args = startArgs(choices({ estimates: { strength: 50, vitality: 1, wisdom: 5, focus: 5, discipline: 4 } }), templateReveal(choices()), nightOwl, LIBRARY);
    expect(args.character).toEqual({ strength: 10, vitality: 3, wisdom: 5, focus: 5, discipline: 4 });
  });

  it('builds day 1: light, at least 6 hours long, with its quests', () => {
    const { day } = startArgs(choices(), templateReveal(choices()), nightOwl, LIBRARY);
    expect(day).toMatchObject({ dayNumber: 1, light: true, budget: 10, timeZone: 'Asia/Manila', protection: null });
    expect(new Date(day.startsAt).getTime()).toBe(nightOwl);
    expect(new Date(day.endsAt).getTime() - nightOwl).toBeGreaterThanOrEqual(6 * HOUR);
    expect(day.quests.length).toBeGreaterThanOrEqual(3);
    for (const q of day.quests) {
      expect(Object.values(q.xp).every((x) => Number.isInteger(x) && x! > 0)).toBe(true);
      expect(q.condition).toHaveProperty('kind');
    }
  });

  it('respects the safety check: a gentle start gets only gentle exercise', () => {
    const { day } = startArgs(choices({ gentleStart: true }), templateReveal(choices()), nightOwl, LIBRARY);
    for (const q of day.quests) {
      const template = LIBRARY.templates.find((t) => t.id === q.templateId)!;
      if (template.exercise !== null) expect(template.gentle).toBe(true);
    }
  });
});

describe('the reveal', () => {
  it.each(VOICES)('the template reveal in the %s voice is clean and names the class', (voice) => {
    for (const classId of ['warrior', 'mage', 'rogue', 'monk'] as const) {
      const reveal = templateReveal(choices({ voice, classId }));
      expect(reveal.source).toBe('template');
      expect(lintText(reveal.narrative)).toEqual([]);
      expect(reveal.narrative.length).toBeLessThanOrEqual(600);
      expect(reveal.strengths).toHaveLength(2);
      expect(reveal.growth).toHaveLength(1);
    }
  });

  const good = { narrative: 'Rin, the Warrior. Strength leads; Vitality follows close behind.', strengths: ['Strength'], growth: ['Focus'] };

  it('accepts a valid Claude reveal', () => {
    expect(parseReveal(good)).toEqual({ ...good, source: 'claude' });
  });

  it.each([
    ['missing fields', { narrative: good.narrative }],
    ['a long narrative', { ...good, narrative: 'x'.repeat(601) }],
    ['a short narrative', { ...good, narrative: 'Hi.' }],
    ['too many strengths', { ...good, strengths: ['a', 'b', 'c', 'd'] }],
    ['an empty growth list', { ...good, growth: [] }],
    ['a long item', { ...good, growth: ['x'.repeat(61)] }],
    ['a banned phrase', { ...good, narrative: 'Your journey begins now, Rin, as a Warrior of note.' }],
    ['a shaming word', { ...good, growth: ['Stop being lazy'] }],
    ['not an object', 'Rin the Warrior'],
  ])('rejects %s', (_, value) => {
    expect(parseReveal(value)).toBeNull();
  });

  it('gives Claude the rules\' numbers, not the raw estimates', () => {
    const facts = JSON.parse(revealFacts(choices({ estimates: { strength: 50, vitality: 1, wisdom: 5, focus: 5, discipline: 4 } })));
    expect(facts.startingPoints).toEqual({ Strength: 10, Vitality: 3, Wisdom: 5, Focus: 5, Discipline: 4 });
    expect(facts.class).toBe('Warrior');
  });
});
