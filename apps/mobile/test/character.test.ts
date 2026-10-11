import { abilityStatus, classAbilities, scholarsPathOpen, statLine, statusText, trainingUnset } from '../src/game/character.ts';

describe('the class path (M6d decision 9)', () => {
  it("lists the class's two abilities in unlock order", () => {
    expect(classAbilities('warrior')).toEqual(['second_wind', 'unbreakable']);
    expect(classAbilities('monk')).toEqual(['stillness', 'dawn_ritual']);
  });

  it('says what each ability needs, or whether it is ready', () => {
    expect(abilityStatus('stillness', 'monk', 3, null, 9)).toEqual({ kind: 'locked', level: 5, left: 2 });
    expect(abilityStatus('stillness', 'monk', 5, null, 9)).toEqual({ kind: 'ready' });
    expect(abilityStatus('stillness', 'monk', 5, 6, 9)).toEqual({ kind: 'cooldown', days: 4 });
    expect(abilityStatus('stillness', 'monk', 5, 6, 12)).toEqual({ kind: 'cooldown', days: 1 });
    expect(abilityStatus('stillness', 'monk', 5, 6, 13)).toEqual({ kind: 'ready' });
    expect(abilityStatus('dawn_ritual', 'monk', 10, null, 9)).toEqual({ kind: 'unlocked' });
    expect(abilityStatus('second_wind', 'warrior', 6, null, 9)).toEqual({ kind: 'later' });
    expect(abilityStatus('second_wind', 'warrior', 2, null, 9)).toEqual({ kind: 'locked', level: 5, left: 3 });
  });

  it('puts each status in words', () => {
    expect(statusText({ kind: 'locked', level: 10, left: 4 })).toBe('Level 10 · 4 to go');
    expect(statusText({ kind: 'cooldown', days: 1 })).toBe('Ready again tomorrow');
    expect(statusText({ kind: 'cooldown', days: 4 })).toBe('Ready again in 4 days');
    expect(statusText({ kind: 'later' })).toBe('Unlocked · it arrives in a later update');
  });
});

describe('the stat line (M6d decision 8)', () => {
  it('names the XP to the next point, the rank one point away, and how Discipline grows', () => {
    expect(statLine('strength', 11, 100)).toBe('98 XP to 12');
    expect(statLine('vitality', 9, 10)).toBe('12 XP to 10 · rank D at 10');
    expect(statLine('discipline', 5, 0)).toBe('22 XP to 6 · grows only from showing up');
  });
});

it("Scholar's Path opens for a Mage at level 10 only", () => {
  expect(scholarsPathOpen('mage', 10)).toBe(true);
  expect(scholarsPathOpen('mage', 9)).toBe(false);
  expect(scholarsPathOpen('warrior', 20)).toBe(false);
});

it('the training is unset: no equipment, no preference, no own plan, no gentle start (decision 13)', () => {
  const p = { equipment: [], programStyle: 'none', ownProgram: false, gentleStart: false } as const;
  expect(trainingUnset(p)).toBe(true);
  expect(trainingUnset({ ...p, equipment: ['bands'] })).toBe(false);
  expect(trainingUnset({ ...p, programStyle: 'women' })).toBe(false);
  expect(trainingUnset({ ...p, ownProgram: true })).toBe(false);
  expect(trainingUnset({ ...p, gentleStart: true })).toBe(false);
});
