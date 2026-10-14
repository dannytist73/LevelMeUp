// M10c decisions 7–8: workouts and rep logs remember last time on this phone, and a set's Done starts the rest.
import { PLAY_TEXT, fillText } from '@levelmeup/content';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { project } from '../src/game/project.ts';
import type { PhoneEvent } from '../src/game/types.ts';
import { moveKey, questKey, readLastSets, sessionMemory, setsLine, startFromLast } from '../src/quest/lastSets.ts';
import { REST_MORE_MS, REST_MS, moreRest, restClock, restLeft, startRest } from '../src/quest/rest.ts';
import { Quest } from '../src/screens/Quest.tsx';
import { RepLog } from '../src/screens/quest/RepLog.tsx';
import { WorkoutLog } from '../src/screens/quest/WorkoutLog.tsx';
import { buzz } from '../src/ui/haptics.ts';
import { DAY_TWO_NOW, workoutState } from './support/fixtures.ts';
import { testStore, withStore } from './support/store.ts';

const MOVES = [
  { move: 'goblet-squat', unit: 'reps', min: 10, max: 15, perSide: false, sets: 2 },
  { move: 'plank', unit: 'seconds', min: 20, max: 40, perSide: false, sets: 1 },
] as const;
const R = PLAY_TEXT.rest;

describe('last sets (decision 7)', () => {
  it('reads only well-formed entries', () => {
    expect(readLastSets(null)).toEqual({});
    expect(readLastSets('not json')).toEqual({});
    expect(readLastSets('[1,2]')).toEqual({});
    expect(readLastSets(JSON.stringify({ 'move:a': [10, 9], 'quest:b': [5], other: [1], 'move:c': [], 'move:d': [1.5], 'move:e': [-1] })))
      .toEqual({ 'move:a': [10, 9], 'quest:b': [5] });
  });

  it("splits a logged workout back into each exercise's sets", () => {
    expect(sessionMemory(MOVES, [12, 11, 30])).toEqual({ [moveKey('goblet-squat')]: [12, 11], [moveKey('plank')]: [30] });
  });

  it("starts each set at last time's number when it lies in today's range, else at the bottom", () => {
    expect(startFromLast(MOVES, {})).toEqual([[10, 10], [20]]);
    expect(startFromLast(MOVES, { [moveKey('goblet-squat')]: [12, 16], [moveKey('plank')]: [25] })).toEqual([[12, 10], [25]]);
    expect(startFromLast(MOVES, { [moveKey('goblet-squat')]: [13] })).toEqual([[13, 10], [20]]);
    expect(setsLine([10, 9, 8])).toBe('10 · 9 · 8');
  });
});

describe('the rest (decision 8)', () => {
  it('runs two minutes, takes 15 seconds more, and reads as a clock', () => {
    const rest = startRest(1_000);
    expect(restLeft(rest, 1_000)).toBe(REST_MS);
    expect(restLeft(moreRest(rest, 1_000), 1_000)).toBe(REST_MS + REST_MORE_MS);
    expect(restLeft(moreRest(rest, 1_000 + REST_MS + 5_000), 1_000 + REST_MS + 5_000)).toBe(REST_MORE_MS); // after it ended
    expect(restLeft(rest, 1_000 + REST_MS + 1)).toBe(0);
    expect(restLeft(null, 0)).toBe(0);
    expect(restClock(REST_MS)).toBe('2:00');
    expect(restClock(105_000)).toBe('1:45');
    expect(restClock(1)).toBe('0:01');
  });

  describe('on the logs', () => {
    let t = 0;
    const now = () => t;
    beforeEach(() => {
      jest.useFakeTimers();
      t = 1_000_000;
      jest.mocked(buzz).mockClear();
    });
    afterEach(() => jest.useRealTimers());
    const pass = async (ms: number) => act(async () => {
      t += ms;
      jest.advanceTimersByTime(ms);
    });

    it("a set's Done starts the rest; +15 s, Skip; at zero a click and \"Rest over\"; the last set starts none", async () => {
      const onClaim = jest.fn();
      await render(<RepLog condition={{ kind: 'reps', sets: 2, reps: 10 } as never} disabled={false} onClaim={onClaim} now={now} />);
      const first = screen.getByRole('checkbox', { name: fillText(R.done, { n: 1 }) });
      await fireEvent.press(first);
      expect(screen.getByRole('checkbox', { name: fillText(R.done, { n: 1 }) }).props.accessibilityState).toEqual({ checked: true });
      expect(screen.getByText(fillText(R.left, { time: '2:00' }))).toBeTruthy();
      await pass(15_000);
      expect(screen.getByText(fillText(R.left, { time: '1:45' }))).toBeTruthy();
      await fireEvent.press(screen.getByRole('button', { name: R.moreLabel }));
      expect(screen.getByText(fillText(R.left, { time: '2:00' }))).toBeTruthy();
      await fireEvent.press(screen.getByRole('button', { name: R.skip }));
      expect(screen.queryByText(/^Rest \d/)).toBeNull();
      await fireEvent.press(screen.getByRole('checkbox', { name: fillText(R.done, { n: 1 }) })); // unticked: no rest
      await fireEvent.press(screen.getByRole('checkbox', { name: fillText(R.done, { n: 1 }) })); // ticked again: a rest
      await pass(REST_MS + 500);
      expect(buzz).toHaveBeenCalledWith('stamp');
      expect(buzz).toHaveBeenCalledTimes(1);
      expect(screen.getByText(R.over)).toBeTruthy();
      await fireEvent.press(screen.getByRole('checkbox', { name: fillText(R.done, { n: 2 }) })); // the last set
      expect(screen.queryByText(/^Rest \d/)).toBeNull();
      await fireEvent.press(screen.getByRole('button', { name: PLAY_TEXT.claim.log }));
      expect(onClaim).toHaveBeenCalledWith({ sets: [10, 10] }); // the checks change nothing that's logged
    });

    it("a workout shows last time's sets, starts from them, and rests under the exercise in play", async () => {
      const last = { [moveKey('goblet-squat')]: [12, 11] };
      const onClaim = jest.fn();
      await render(<WorkoutLog moves={MOVES} disabled={false} onClaim={onClaim} last={last} now={now} />);
      expect(screen.getByText(fillText(PLAY_TEXT.workout.lastTime, { sets: '12 · 11' }))).toBeTruthy();
      await fireEvent.press(screen.getAllByRole('checkbox')[0]!);
      expect(screen.getByText(fillText(R.left, { time: '2:00' }))).toBeTruthy();
      await fireEvent.press(screen.getByRole('button', { name: PLAY_TEXT.workout.log }));
      expect(onClaim).toHaveBeenCalledWith({ sets: [12, 11, 20] });
    });
  });
});

describe('the quest screen remembers what was logged', () => {
  it("a workout's sets, by exercise; a rep log's, by quest", async () => {
    const server = workoutState();
    const store = testStore({ view: project(server, []) });
    const enqueue = jest.fn(async (_event: Omit<PhoneEvent, 'id'>) => {});
    store.setState({ enqueue: enqueue as never });
    await render(withStore(store, <Quest questId={200} onBack={jest.fn()} onSwap={jest.fn()} onPain={jest.fn()} now={() => DAY_TWO_NOW} />));
    await fireEvent.press(screen.getByRole('button', { name: PLAY_TEXT.workout.log }));
    const quest = server.today!.quests.find((q) => q.id === 200)!;
    if (quest.condition.kind !== 'session') throw new Error('expected a workout');
    const sent = (enqueue.mock.calls.at(-1)![0] as unknown as { payload: { sets: number[] } }).payload.sets;
    expect(store.getState().rememberSets).toHaveBeenCalledWith(sessionMemory(quest.condition.moves, sent));
    expect(questKey('push-1')).toBe('quest:push-1');
  });
});
