import { describe, expect, it } from 'vitest';
import { LIBRARY, VOICES, lintText } from '../../../packages/content/src/index.ts';
import { isProblem } from '../../functions/_shared/http.ts';
import { parseOnboarding, parseReveal, revealFacts, startArgs, templateReveal } from '../../functions/_shared/onboarding.ts';
import type { Choices } from '../../functions/_shared/onboarding.ts';
import { HOUR, choices, onboardingBody } from './fixtures.ts';

describe('the onboarding body', () => {
  it('turns the answers into the character\'s choices, with the time zone canonicalised', () => {
    expect(parseOnboarding(onboardingBody({ name: '  Rin  ' }))).toEqual(choices());
  });

  it('computes every number itself: the class from the goals, the estimates from the answers', () => {
    const parsed = parseOnboarding(onboardingBody({
      goals: ['learn'], training: 'most', reading: 'high', estimates: { strength: 50 }, gentleStart: false, ownProgram: true,
    })) as Choices;
    expect(parsed).toMatchObject({
      classId: 'mage', estimates: { strength: 6, vitality: 6, wisdom: 6, focus: 5, discipline: 4 }, reading: 'high', focus: null,
      ownProgram: false,
    });
  });

  it('keeps the class the player picked on the reveal', () => {
    expect(parseOnboarding(onboardingBody({ classId: 'rogue' }))).toMatchObject({ classId: 'rogue' });
  });

  it('any yes on the safety check means a gentle start, and the answers themselves are not kept', () => {
    const parsed = parseOnboarding(onboardingBody({ safety: [false, false, true, false, false, false, false] })) as Choices;
    expect(parsed.gentleStart).toBe(true);
    expect(Object.keys(parsed)).not.toContain('safety');
  });

  it('an own plan means the own-program quest', () => {
    expect(parseOnboarding(onboardingBody({ training: 'own' }))).toMatchObject({ training: 'own', ownProgram: true });
  });

  it('ignores reading and focus answers for goals the player didn\'t pick', () => {
    expect(parseOnboarding(onboardingBody({ reading: 'high', focus: 'low' }))).toMatchObject({ reading: null, focus: null });
  });

  it.each([
    ['name', { name: '' }], ['name', { name: 'x'.repeat(41) }], ['name', { name: 'a\u0000b' }],
    ['voice', { voice: 'pirate' }],
    ['goals', { goals: [] }], ['goals', { goals: ['body', 'focus', 'learn'] }], ['goals', { goals: ['body', 'body'] }], ['goals', { goals: ['wealth'] }],
    ['classId', { classId: 'paladin' }], ['classId', { classId: '__proto__' }],
    ['training', { training: 'daily' }], ['training', { training: undefined }],
    ['reading', { goals: ['learn'], reading: null }], ['reading', { goals: ['learn'], reading: 'lots' }],
    ['focus', { goals: ['focus'], focus: undefined }],
    ['safety', { safety: [true] }], ['safety', { safety: Array(7).fill('no') }], ['safety', { safety: undefined }],
    ['minutesPerDay', { minutesPerDay: 30 }],
    ['difficulty', { difficulty: 'nightmare' }],
    ['boundaryMinutes', { boundaryMinutes: 1440 }], ['boundaryMinutes', { boundaryMinutes: 1.5 }],
    ['timeZone', { timeZone: 'Mars/Base' }],
    ['limitations', { limitations: ['neck'] }],
  ])('rejects a bad %s', (field, over) => {
    expect(parseOnboarding(onboardingBody(over))).toEqual({ status: 400, code: 'bad_field', detail: field });
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

  it('starts experienced players one rung up, never past a gentle start', () => {
    const most = startArgs(choices({ training: 'most' }), templateReveal(choices()), nightOwl, LIBRARY);
    expect(Object.keys(most.ladders).sort()).toEqual(['core', 'push', 'squat', 'walk']);
    expect(Object.values(most.ladders).every((l) => l.rung === 1)).toBe(true);
    const gentle = startArgs(choices({ training: 'most', gentleStart: true }), templateReveal(choices()), nightOwl, LIBRARY);
    expect(gentle.ladders).toEqual({});
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

  it('tells Claude about a gentle start and the limits, so the words never push past them', () => {
    expect(JSON.parse(revealFacts(choices({ gentleStart: true, limitations: ['knee'] }))))
      .toMatchObject({ exercise: 'gentle only: easy walks and stretches', limits: ['Knees'] });
    expect(JSON.parse(revealFacts(choices()))).toMatchObject({ exercise: 'normal', limits: [] });
  });

  it('gives Claude the rules\' numbers, not the raw estimates', () => {
    const facts = JSON.parse(revealFacts(choices({ estimates: { strength: 50, vitality: 1, wisdom: 5, focus: 5, discipline: 4 } })));
    expect(facts.startingPoints).toEqual({ Strength: 10, Vitality: 3, Wisdom: 5, Focus: 5, Discipline: 4 });
    expect(facts.class).toBe('Warrior');
  });
});
