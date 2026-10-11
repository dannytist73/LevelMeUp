/** @jest-environment node */
import { checkCompletionPayload } from '../../../supabase/functions/_shared/events.ts';
import { samplePayload } from '../src/dev/samplePayload.ts';
import type { QuestView } from '../src/game/types.ts';
import { serverState } from './support/fixtures.ts';

const day = serverState().today!;
const dayRow = { starts_at: new Date(day.startsAt!), ends_at: new Date(day.endsAt!) };
const base = day.quests[0]!;
const quest = (over: Partial<QuestView>): QuestView => ({ ...base, ...over });

describe('the developer screen\'s sample completions', () => {
  const now = Date.parse(day.startsAt!) + 3 * 3_600_000; // three hours into the day

  it.each([
    ['tap', quest({ completion: 'tap', condition: { kind: 'habit' } })],
    ['reps', quest({ completion: 'reps', condition: { kind: 'reps', sets: 3, reps: 8, perSide: false } })],
    ['text', quest({ completion: 'text', condition: { kind: 'sentence' } })],
    ['timer (minutes)', quest({ completion: 'timer', condition: { kind: 'minutes', minutes: 20 }, minutes: 20 })],
    ['timer (holds)', quest({ completion: 'timer', condition: { kind: 'hold', sets: 3, seconds: 30, perSide: true }, minutes: 5 })],
  ] as const)('%s: the server accepts it', (_, q) => {
    const checked = checkCompletionPayload(q, dayRow, samplePayload(q, day, now), now);
    expect(checked).not.toHaveProperty('code');
  });

  it('a timer longer than the day so far comes up short, as it would for real', () => {
    const early = Date.parse(day.startsAt!) + 60_000;
    const q = quest({ completion: 'timer', condition: { kind: 'minutes', minutes: 20 }, minutes: 20 });
    expect(checkCompletionPayload(q, dayRow, samplePayload(q, day, early), early)).toEqual({ code: 'timer_short' });
  });

  it('every quest of a real day gets a payload the server accepts (or an honest short timer)', () => {
    for (const q of day.quests) {
      const checked = checkCompletionPayload(q, dayRow, samplePayload(q, day, now), now);
      if ('code' in checked) expect(checked.code).toBe('timer_short');
    }
  });
});
