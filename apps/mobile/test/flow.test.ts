/** @jest-environment node */
import { isProblem } from '../../../supabase/functions/_shared/http.ts';
import { parseOnboarding } from '../../../supabase/functions/_shared/onboarding.ts';
import { clockLabel } from '../src/lib/dates.ts';
import {
  ANALYSIS_PATH, NEW_DRAFT, STEP_PATH, boundaryOf, complete, draftProfile, gentleStart, nextPath, persistable, restoreDraft,
  stepsFor, toRequest, toggleGoal, toggleLimit,
} from '../src/onboarding/flow.ts';
import type { Draft } from '../src/onboarding/flow.ts';
import { READY_DRAFT as READY } from './support/fixtures.ts';

describe('the interview\'s screens', () => {
  it('asks the mind screen only for the Learn or Focus goal', () => {
    expect(stepsFor(READY)).toEqual(['awakening', 'voice', 'goals', 'body', 'rhythm', 'slip']);
    expect(stepsFor({ ...READY, goals: ['body', 'learn'] })).toContain('mind');
    expect(stepsFor({ ...READY, goals: ['focus'] })).toContain('mind');
  });

  it('goes to the next screen this player sees, then to the analysis', () => {
    expect(nextPath(READY, 'body')).toBe(STEP_PATH.rhythm);
    expect(nextPath({ ...READY, goals: ['learn'] }, 'body')).toBe(STEP_PATH.mind);
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
