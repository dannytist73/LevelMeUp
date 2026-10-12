/** @jest-environment node */
import { isProblem } from '../../../supabase/functions/_shared/http.ts';
import { parseOnboarding } from '../../../supabase/functions/_shared/onboarding.ts';
import { clockLabel } from '../src/lib/dates.ts';
import {
  ANALYSIS_PATH, NEW_DRAFT, STEP_PATH, boundaryOf, complete, draftProfile, gentleStart, nextPath, persistable, restoreDraft,
  stepsFor, toRequest, toggleEquipment, toggleGoal, toggleLimit,
} from '../src/onboarding/flow.ts';
import type { Draft } from '../src/onboarding/flow.ts';
import { READY_DRAFT as READY } from './support/fixtures.ts';

describe('the interview\'s screens', () => {
  it('asks the mind screen only for the Learn or Focus goal', () => {
    expect(stepsFor(READY)).toEqual(['awakening', 'voice', 'goals', 'body', 'gear', 'rhythm', 'slip']);
    expect(stepsFor({ ...READY, goals: ['body', 'learn'] })).toContain('mind');
    expect(stepsFor({ ...READY, goals: ['focus'] })).toContain('mind');
  });

  it('goes to the next screen this player sees, then to the analysis', () => {
    expect(nextPath(READY, 'body')).toBe(STEP_PATH.gear);
    expect(nextPath({ ...READY, goals: ['learn'] }, 'gear')).toBe(STEP_PATH.mind);
    expect(nextPath(READY, 'slip')).toBe(ANALYSIS_PATH);
  });

  it.each([
    ['awakening', { name: '  ' }], ['awakening', { name: 'x'.repeat(41) }], ['awakening', { name: 'a\u0000b' }],
    ['voice', { voice: null }], ['goals', { goals: [] }],
    ['body', { training: null }], ['body', { noLimits: false, limitations: [] }],
    ['body', { safety: [false, false, false, false, false, false, null] }],
    ['mind', { goals: ['learn'], reading: null }], ['mind', { goals: ['focus'], focus: null }],
    ['rhythm', { sleep: 420, wake: 420 }], ['slip', { slip: null }],
  ] as const)('%s waits for its answers (%j)', (step, over) => {
    expect(complete(READY, step)).toBe(true);
    expect(complete({ ...READY, ...over } as Draft, step)).toBe(false);
  });

  it('allows two goals at most', () => {
    expect(toggleGoal(['body', 'learn'], 'focus')).toEqual(['body', 'learn']);
    expect(toggleGoal(['body', 'learn'], 'body')).toEqual(['learn']);
    expect(toggleGoal(['body'], 'learn')).toEqual(['body', 'learn']);
  });

  it('"Nothing" and a limit exclude each other', () => {
    expect(toggleLimit({ ...READY, noLimits: false, limitations: ['knee'] }, 'nothing')).toEqual({ limitations: [], noLimits: true });
    expect(toggleLimit({ ...READY, noLimits: true }, 'back')).toEqual({ limitations: ['back'], noLimits: false });
    expect(toggleLimit({ ...READY, noLimits: false, limitations: ['back'] }, 'back')).toEqual({ limitations: [], noLimits: false });
  });
});

describe('the request', () => {
  it('is what the server accepts, and the server picks the class from the goals', () => {
    const parsed = parseOnboarding(toRequest(READY, 'Asia/Manila', false));
    expect(isProblem(parsed)).toBe(false);
    expect(parsed).toMatchObject({ classId: 'warrior', gentleStart: false, boundaryMinutes: 240 });
  });

  it('sends reading and focus only for their goals, and a class only when the player picked one', () => {
    const learn = toRequest({ ...READY, goals: ['learn'], reading: 'high', focus: 'low' }, 'UTC', false);
    expect(learn).toMatchObject({ reading: 'high', focus: null, redo: false });
    expect(learn).not.toHaveProperty('classId');
    expect(isProblem(parseOnboarding(learn))).toBe(false);
    expect(toRequest({ ...READY, classId: 'monk' }, 'UTC', true)).toMatchObject({ classId: 'monk', redo: true });
  });

  it('sends the safety answers; any yes is a gentle start', () => {
    const answers = READY.safety.map((_, i) => i === 3);
    const body = toRequest({ ...READY, safety: answers }, 'UTC', false);
    expect(body.safety).toEqual(answers);
    expect(gentleStart({ ...READY, safety: answers })).toBe(true);
    expect(parseOnboarding(body)).toMatchObject({ gentleStart: true });
  });

  it('takes the day boundary from the sleep times', () => {
    expect(boundaryOf({ ...READY, sleep: 8 * 60, wake: 16 * 60 })).toBe(12 * 60);
    expect(toRequest({ ...READY, sleep: 8 * 60, wake: 16 * 60 }, 'UTC', false).boundaryMinutes).toBe(720);
  });
});

describe('what the phone keeps', () => {
  it('never writes the safety answers (spec §4.5)', () => {
    const json = persistable({ ...READY, safety: READY.safety.map(() => true) });
    expect(json).not.toContain('safety');
    expect(restoreDraft(json)).toEqual({ ...READY, safety: NEW_DRAFT.safety });
  });

  it('starts from a new draft when there is nothing, or something damaged', () => {
    expect(restoreDraft(null)).toEqual(NEW_DRAFT);
    expect(restoreDraft('{oops')).toEqual(NEW_DRAFT);
    expect(restoreDraft('[]')).toEqual(NEW_DRAFT);
  });
});

describe('the profile the rules see while the player answers', () => {
  it('follows the answers: own plan, gentle start, the suggested class', () => {
    expect(draftProfile({ ...READY, goals: ['learn'], training: 'own', safety: READY.safety.map((_, i) => i === 0) }))
      .toMatchObject({ classId: 'mage', ownProgram: true, gentleStart: true });
  });
});

describe('clock labels', () => {
  it.each([[0, '12:00 AM'], [30, '12:30 AM'], [7 * 60, '7:00 AM'], [12 * 60, '12:00 PM'], [23 * 60 + 30, '11:30 PM']])(
    '%d → %s', (minutes, label) => expect(clockLabel(minutes)).toBe(label),
  );
});

describe('the Training step (M6c decision 2)', () => {
  it('follows Body when strength work is possible; never for an own plan or a gentle start', () => {
    expect(stepsFor(READY)).toEqual(['awakening', 'voice', 'goals', 'body', 'gear', 'rhythm', 'slip']);
    expect(nextPath(READY, 'body')).toBe(STEP_PATH.gear);
    expect(stepsFor({ ...READY, training: 'own' })).not.toContain('gear');
    expect(stepsFor({ ...READY, safety: READY.safety.map((_, i) => i === 0) })).not.toContain('gear');
  });

  it('needs a program, and equipment or "Just my body"', () => {
    expect(complete({ ...READY, programStyle: null }, 'gear')).toBe(false);
    expect(complete({ ...READY, equipment: [], noEquipment: false }, 'gear')).toBe(false);
    expect(complete({ ...READY, equipment: ['bands'], noEquipment: false, programStyle: 'women' }, 'gear')).toBe(true);
    expect(complete({ ...READY, programStyle: 'men' }, 'gear')).toBe(true);
  });

  it('"Just my body" and equipment exclude each other', () => {
    expect(toggleEquipment({ ...READY, equipment: ['bands'], noEquipment: false }, 'nothing')).toEqual({ equipment: [], noEquipment: true });
    expect(toggleEquipment(READY, 'gym')).toEqual({ equipment: ['gym'], noEquipment: false });
    expect(toggleEquipment({ ...READY, equipment: ['gym'], noEquipment: false }, 'gym')).toEqual({ equipment: [], noEquipment: false });
  });

  it('sends the setup, or the defaults when the step was skipped; the server accepts both', () => {
    const asked = toRequest({ ...READY, equipment: ['dumbbells'], noEquipment: false, programStyle: 'women' }, 'Asia/Manila', false);
    expect(asked).toMatchObject({ equipment: ['dumbbells'], programStyle: 'women' });
    const own = toRequest({ ...READY, training: 'own', equipment: ['gym'], programStyle: 'men' }, 'Asia/Manila', false);
    expect(own).toMatchObject({ equipment: [], programStyle: 'none' });
    expect(isProblem(parseOnboarding(asked))).toBe(false);
    expect(isProblem(parseOnboarding(own))).toBe(false);
    expect(draftProfile({ ...READY, training: 'own', programStyle: 'men' }).programStyle).toBe('none'); // review
  });

  it('a draft saved before M6c comes back with the Training step unanswered', () => {
    const old = JSON.stringify({ ...READY, equipment: undefined, noEquipment: undefined, programStyle: undefined });
    expect(restoreDraft(old)).toMatchObject({ equipment: [], noEquipment: false, programStyle: null });
  });
});

it('keeps a pact signed on the reveal, and only a level the Pact screen can sign (M7c)', () => {
  expect(restoreDraft(JSON.stringify({ ...NEW_DRAFT, pact: 2 })).pact).toBe(2);
  expect(restoreDraft(JSON.stringify({ ...NEW_DRAFT, pact: 3 })).pact).toBeNull();
  expect(restoreDraft(JSON.stringify({ name: 'Rin' })).pact).toBeNull();
});
