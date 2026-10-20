import { describe, expect, it } from 'vitest';
import { moveTarget, questSummary, targetText } from '../src/format.ts';
import { READING_TEXT } from '../src/reading.ts';
import { SETTINGS_TEXT } from '../src/settings.ts';

describe('quest targets in words', () => {
  it.each([
    [{ kind: 'reps', sets: 3, reps: 8, perSide: false }, '3 sets of 8'],
    [{ kind: 'reps', sets: 1, reps: 10, perSide: true }, '1 set of 10 per side'],
    [{ kind: 'hold', sets: 4, seconds: 30, perSide: false }, '4 holds of 30 seconds'],
    [{ kind: 'minutes', minutes: 20 }, '20 minutes'],
    [{ kind: 'minutes', minutes: 1 }, '1 minute'],
    [{ kind: 'sentence' }, 'One sentence'],
    [{ kind: 'habit' }, ''],
  ] as const)('%o reads "%s"', (condition, text) => {
    expect(targetText(condition)).toBe(text);
  });

  it('reads a workout template and a planned session', () => {
    expect(targetText({ kind: 'workout', sets: [2, 2, 2], level: 1 })).toBe('3 exercises, 2 sets each');
    expect(targetText({ kind: 'workout', sets: [4, 3, 3, 3], level: 3 })).toBe('4 exercises, 3–4 sets each');
    const session = {
      kind: 'session',
      moves: [
        { move: 'goblet-squat', unit: 'reps', min: 10, max: 15, perSide: false, sets: 2 },
        { move: 'plank', unit: 'seconds', min: 20, max: 40, perSide: false, sets: 2 },
      ],
    } as const;
    expect(targetText(session)).toBe('Goblet squat, Forearm plank');
    expect(moveTarget(session.moves[0])).toBe('2 sets of 10–15 reps');
    expect(moveTarget({ ...session.moves[1], perSide: true, sets: 1 })).toBe('1 hold of 20–40 seconds per side');
    expect(questSummary({ condition: session, minutes: 16 })).toBe('Goblet squat, Forearm plank · about\u00a016\u00a0min');
  });

  it('summarises a quest as it is stored: its condition and minutes', () => {
    expect(questSummary({ condition: { kind: 'reps', sets: 3, reps: 8, perSide: false }, minutes: 10 })).toBe('3 sets of 8 · about\u00a010\u00a0min');
    expect(questSummary({ condition: { kind: 'minutes', minutes: 20 }, minutes: 20 })).toBe('20 minutes');
    expect(questSummary({ condition: { kind: 'habit' }, minutes: 2 })).toBe('about\u00a02\u00a0min');
  });
});

// M17: short phrases a narrow row must not break (the app's screen tests can't see this: they collapse every space).
describe('no-break spaces', () => {
  it('keep "about 4 min", "15 min a day" and "your line saved" whole', () => {
    expect(READING_TEXT.deck.cards).toContain('about\u00a0{minutes}\u00a0min');
    expect(READING_TEXT.deck.cardsXp).toContain('about\u00a0{minutes}\u00a0min');
    expect(SETTINGS_TEXT.game.row).toContain('{minutes}\u00a0min a\u00a0day');
    expect(READING_TEXT.library.lineSaved).toBe('your\u00a0line\u00a0saved');
  });
});
