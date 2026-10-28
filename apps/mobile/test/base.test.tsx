import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { BASE_KEY, BaseProvider, createBaseStore } from '../src/base/store.ts';
import type { Blobs } from '../src/base/store.ts';
import { warmupSets } from '../src/base/logic.ts';
import { newExercises, readBase, restarted, widgetLines } from '../src/base/logic.ts';
import { currentBook, dailyNotes, doneThisWeek, place, readDaysThisWeek, recentFoods, suggestTargets } from '../src/base/logic.ts';
import { baseMove } from '@levelmeup/content';

const loaded = (id: string) => baseMove(id).needs.some((n) => n === 'gym' || n === 'dumbbells');
import type { PlanSetup } from '../src/base/logic.ts';
import { Setup } from '../src/base/screens/Setup.tsx';
import { FoodAdd } from '../src/base/screens/Eat.tsx';
import { Today } from '../src/base/screens/Today.tsx';
import { Workout } from '../src/base/screens/Workout.tsx';
import { Exercise } from '../src/base/screens/Exercise.tsx';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), dismissAll: jest.fn(), canDismiss: jest.fn(() => false) } }));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));

const memory = (): Blobs & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: async (k) => data.get(k) ?? null, setItem: async (k, v) => void data.set(k, v) };
};
const T0 = new Date(2026, 9, 28, 9, 0).getTime();
const PLAN: PlanSetup = { style: 'men', experience: 'regular', length: { kind: 'weeks', weeks: 6 }, days: 3, where: 'both', home: ['dumbbells'], limitations: [], startedAt: T0 };

function setup(now = () => T0) {
  let n = 0;
  const blobs = memory();
  const store = createBaseStore({ blobs, now, newId: () => `id-${++n}` });
  return { store, blobs };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('the base store', () => {
  it('starts a week-1 workout at the gym: 2 sets of each, nothing done', () => {
    const { store } = setup();
    store.getState().setPlan(PLAN);
    const w = store.getState().startWorkout()!;
    expect(w.place).toBe('gym');
    expect(w.week).toBe(1);
    expect(w.exercises.length).toBeGreaterThanOrEqual(5);
    expect(w.exercises.every((e) => e.sets.length === 2 && e.sets.every((s) => !s.done))).toBe(true);
  });

  it('keeps only done sets when finished, and the next workout is B with last time prefilled', () => {
    let now = T0;
    const { store } = setup(() => now);
    store.getState().setPlan(PLAN);
    store.getState().startWorkout();
    store.getState().setSet(0, 0, { weight: 40, reps: 8 });
    expect(store.getState().toggleSet(0, 0)).toBe(true);
    now += 60 * 60_000;
    const done = store.getState().finishWorkout()!;
    expect(done.exercises).toHaveLength(1);
    expect(done.exercises[0]!.sets).toEqual([{ weight: 40, reps: 8, done: true }]);
    expect(place(store.getState(), now)).toMatchObject({ day: 1, week: 1 });
    expect(doneThisWeek(store.getState(), now)).toBe(1);
  });

  it('the next time a move comes round, its sets start at the advised weight', () => {
    let now = T0;
    const { store } = setup(() => now);
    store.getState().setPlan({ ...PLAN, days: 2, startedAt: T0 - 1 });
    const first = store.getState().startWorkout()!;
    const ex = first.exercises.findIndex((e) => e.target.kind === 'range' && loaded(e.move));
    const max = (first.exercises[ex]!.target as { max: number }).max;
    first.exercises[ex]!.sets.forEach((_, i) => {
      store.getState().setSet(ex, i, { weight: 20, reps: max });
      store.getState().toggleSet(ex, i);
    });
    store.getState().finishWorkout();
    now += 2 * 24 * 60 * 60_000;
    store.getState().startWorkout();
    store.getState().toggleSet(0, 0);
    store.getState().finishWorkout();
    now += 2 * 24 * 60 * 60_000;
    const again = store.getState().startWorkout()!;
    const same = again.exercises.find((e) => e.move === first.exercises[ex]!.move);
    expect(same?.sets[0]?.weight).toBeGreaterThan(20);
  });

  it('a new plan starts at week 1 whatever came before', () => {
    let now = T0;
    const { store } = setup(() => now);
    store.getState().setPlan({ ...PLAN, days: 2 });
    for (let i = 0; i < 3; i++) {
      store.getState().startWorkout();
      store.getState().toggleSet(0, 0);
      now += 24 * 60 * 60_000;
      store.getState().finishWorkout();
    }
    expect(place(store.getState(), now)).toMatchObject({ week: 2 });
    expect(restarted(store.getState(), now)).toBe(false);
    expect(restarted(store.getState(), now + 15 * 24 * 60 * 60_000)).toBe(true);
    expect(place(store.getState(), now + 15 * 24 * 60 * 60_000)).toMatchObject({ week: 1, day: 0 });
    store.getState().setPlan({ ...PLAN, startedAt: now });
    expect(place(store.getState(), now)).toMatchObject({ week: 1, day: 0, finished: false });
  });

  it('All sets -/+ moves every set not done yet by a plate step', () => {
    const { store } = setup();
    store.getState().setPlan(PLAN);
    store.getState().startWorkout();
    store.getState().setSet(0, 0, { weight: 40 });
    store.getState().setSet(0, 1, { weight: 40 });
    store.getState().toggleSet(0, 0);
    store.getState().shiftWeight(0, 2.5);
    expect(store.getState().active!.exercises[0]!.sets.map((x) => x.weight)).toEqual([40, 42.5]);
    store.getState().shiftWeight(0, -50);
    expect(store.getState().active!.exercises[0]!.sets[1]!.weight).toBe(0);
  });

  it('after an easy week, advice looks past its half-rep sets; a new weight starts at the bottom of the range', () => {
    const { store } = setup();
    const ex = (blockWeek: number, weight: number, reps: number) => ({
      id: `w${blockWeek}`, startedAt: blockWeek, finishedAt: blockWeek + 1, day: 0, week: blockWeek, blockWeek, place: 'gym' as const,
      exercises: [{ slot: 'biceps' as const, move: 'db-curl', target: { kind: 'range' as const, min: 10, max: 15, unit: 'reps' as const }, restSeconds: 90, sets: [{ weight, reps, done: true }, { weight, reps, done: true }] }],
    });
    store.setState({ workouts: [ex(5, 10, 15), ex(6, 10, 8)] });
    const [curl] = newExercises(store.getState(), [{ slot: 'biceps', move: 'db-curl', sets: 3, target: { kind: 'range', min: 10, max: 15, unit: 'reps' }, restSeconds: 90 }], 1);
    expect(curl!.sets[0]).toEqual({ weight: 12.5, reps: 10, done: false });
  });

  it('switching kg and lb converts stored weights; an unreadable record is kept aside, not overwritten', async () => {
    const { store, blobs } = setup();
    store.getState().setPlan(PLAN);
    store.getState().startWorkout();
    store.getState().setSet(0, 0, { weight: 60 });
    store.getState().setTargets({ kcal: 2500, protein: 140, weight: 80, goal: 'keep' });
    store.getState().setUnits('lb');
    expect(store.getState().active!.exercises[0]!.sets[0]!.weight).toBe(132.5);
    expect(store.getState().targets!.weight).toBe(176.5);
    store.getState().setUnits('kg');
    expect(store.getState().active!.exercises[0]!.sets[0]!.weight).toBe(60);
    blobs.data.set(BASE_KEY, '{"v":2,"plan":"future"}');
    const again = createBaseStore({ blobs, now: () => 5, newId: () => 'x' });
    await again.getState().load();
    expect(blobs.data.get(`${BASE_KEY}.unread-5`)).toBe('{"v":2,"plan":"future"}');
    expect(again.getState().plan).toBeNull();
  });

  it('a workout with nothing done is not saved', () => {
    const { store } = setup();
    store.getState().setPlan(PLAN);
    store.getState().startWorkout();
    expect(store.getState().finishWorkout()).toBeNull();
    expect(store.getState().workouts).toHaveLength(0);
  });

  it('switching to home re-picks what is not started and keeps what is', () => {
    const { store } = setup();
    store.getState().setPlan(PLAN);
    const w = store.getState().startWorkout()!;
    store.getState().toggleSet(0, 0);
    store.getState().switchPlace('home');
    const after = store.getState().active!;
    expect(after.place).toBe('home');
    expect(after.exercises[0]!.move).toBe(w.exercises[0]!.move);
    expect(after.exercises.slice(1).some((e, i) => e.move !== w.exercises[i + 1]?.move)).toBe(true);
  });

  it('a swap replaces the exercise (even from a neighbouring slot); kept, it stays for the block', () => {
    const { store } = setup();
    store.getState().setPlan(PLAN);
    const w = store.getState().startWorkout()!;
    const slot = w.exercises[0]!.slot;
    store.getState().swap(0, 'barbell-bench-press', false);
    expect(store.getState().active!.exercises[0]).toMatchObject({ slot, move: 'barbell-bench-press', target: { kind: 'fixed', reps: 6 } });
    expect(store.getState().kept).toEqual({});
    store.getState().swap(0, 'push-up', true);
    expect(store.getState().active!.exercises[0]!.move).toBe('push-up');
    expect(store.getState().kept).toEqual({ gym: { [slot]: 'push-up' } });
  });

  it('a swap after sets are done keeps them and adds the new exercise after', () => {
    const { store } = setup();
    store.getState().setPlan(PLAN);
    const w = store.getState().startWorkout()!;
    store.getState().toggleSet(0, 0);
    store.getState().swap(0, 'barbell-bench-press', false);
    const ex = store.getState().active!.exercises;
    expect(ex[0]).toMatchObject({ move: w.exercises[0]!.move, sets: [{ done: true }] });
    expect(ex[1]!.move).toBe('barbell-bench-press');
    expect(ex).toHaveLength(w.exercises.length + 1);
  });

  it('saves to the phone and loads back', async () => {
    const { store, blobs } = setup();
    store.getState().setPlan(PLAN);
    store.getState().addFood({ meal: 'lunch', name: 'Rice', amount: '1 cup', kcal: 200, protein: 4, carbs: 44, fat: null });
    await flush();
    expect(JSON.parse(blobs.data.get(BASE_KEY)!).food).toHaveLength(1);
    const again = createBaseStore({ blobs, now: () => T0, newId: () => 'x' });
    await again.getState().load();
    expect(again.getState().ready).toBe(true);
    expect(again.getState().plan).toEqual(PLAN);
    expect(again.getState().food[0]!.name).toBe('Rice');
  });

  it('food: remove and undo, recent foods once each, targets from weight', () => {
    const { store } = setup();
    const a = store.getState().addFood({ meal: 'lunch', name: 'Rice', amount: '', kcal: 200, protein: 4, carbs: null, fat: null });
    store.getState().addFood({ meal: 'dinner', name: 'rice', amount: '', kcal: 200, protein: 4, carbs: null, fat: null });
    expect(recentFoods(store.getState().food)).toHaveLength(1);
    const gone = store.getState().removeFood(a.id)!;
    expect(store.getState().food).toHaveLength(1);
    store.getState().restoreFood(gone);
    expect(store.getState().food.map((f) => f.id)).toContain(a.id);
    const past = store.getState().addFood({ meal: 'dinner', name: 'Soup', amount: '', kcal: 300, protein: 12, carbs: null, fat: null, day: '2026-10-27' });
    expect(past.day).toBe('2026-10-27');
    expect(suggestTargets(80, 'kg', 'keep')).toEqual({ kcal: 2500, protein: 145, weight: 80, goal: 'keep' });
    expect(suggestTargets(80, 'kg', 'lose').kcal).toBe(2000);
  });

  it('reading: the chosen book and its next unread chapter', () => {
    const { store } = setup();
    store.getState().chooseBook('train-smart');
    store.getState().readChapter('article-36');
    expect(currentBook(store.getState())).toMatchObject({ book: { id: 'train-smart' }, next: 1 });
    expect(readDaysThisWeek(store.getState(), T0)).toBe(1);
    store.getState().leaveChapter('article-20', 3);
    expect(store.getState().reading.at).toEqual({ 'article-20': 3 });
    store.getState().readChapter('article-20');
    expect(store.getState().reading.at).toEqual({});
  });

  it('the daily reminder: off by default, then 7 notes at the chosen hour naming what is next', () => {
    const { store } = setup();
    store.getState().setPlan(PLAN);
    expect(dailyNotes(store.getState(), T0)).toEqual([]);
    store.getState().setReminder('evening');
    const notes = dailyNotes(store.getState(), T0);
    expect(notes).toHaveLength(7);
    expect(new Date(notes[0]!.at).getHours()).toBe(19);
    expect(new Date(notes[0]!.at).getDate()).toBe(28);
    expect(notes[0]!.body).toMatch(/^Workout A is next, and ".+" is waiting to be read\.$/);
    store.getState().setReminder('morning');
    expect(new Date(dailyNotes(store.getState(), T0)[0]!.at).getDate()).toBe(29);
  });

  it('warm-up sets ramp to the working weight on the plate step', () => {
    expect(warmupSets(60, 'kg')).toEqual([{ weight: 30, reps: 6 }, { weight: 45, reps: 4 }, { weight: 52.5, reps: 2 }]);
    expect(warmupSets(135, 'lb')).toEqual([{ weight: 65, reps: 6 }, { weight: 100, reps: 4 }, { weight: 120, reps: 2 }]);
    expect(warmupSets(12.5, 'kg')).toEqual([]);
  });

  it('the widget lines: next workout and week, next chapter, food against the target; none without a plan', () => {
    const { store } = setup();
    expect(widgetLines(store.getState(), T0)).toBeNull();
    store.getState().setPlan(PLAN);
    store.getState().chooseBook('train-smart');
    store.getState().setTargets({ kcal: 2500, protein: 140, weight: 80, goal: 'keep' });
    store.getState().addFood({ meal: 'lunch', name: 'Rice', amount: '', kcal: 1200, protein: 20, carbs: null, fat: null });
    expect(widgetLines(store.getState(), T0)).toEqual({ train: 'Workout A next · Week 1 of 6', read: 'Steady, not heroic', eat: '1,200 of 2,500 kcal' });
    expect(readBase(JSON.stringify({ v: 1, plan: PLAN }))!.plan).toEqual(PLAN);
    expect(readBase('nope')).toBeNull();
  });

  it('the rest timer moves and ends', () => {
    let now = T0;
    const { store } = setup(() => now);
    store.getState().startRest(90);
    store.getState().moveRest(15);
    expect(store.getState().restUntil).toBe(T0 + 105_000);
    now += 200_000;
    store.getState().moveRest(-15);
    expect(store.getState().restUntil).toBeNull();
  });
});

describe('the base screens', () => {
  beforeEach(() => jest.clearAllMocks());

  it('the setup walks to a plan with a custom length', async () => {
    const { store } = setup();
    await render(<BaseProvider store={store}><Setup now={() => T0} /></BaseProvider>);
    await act(async () => fireEvent.press(screen.getByTestId('setup-next')));
    await act(async () => fireEvent.press(screen.getByLabelText(/^Women's plan/)));
    await act(async () => fireEvent.press(screen.getByTestId('setup-next')));
    await act(async () => fireEvent.press(screen.getByLabelText(/^New to lifting/)));
    await act(async () => fireEvent.press(screen.getByTestId('setup-next')));
    await act(async () => fireEvent.press(screen.getByLabelText('Custom')));
    expect(screen.getByTestId('custom-weeks')).toHaveTextContent('10 weeks');
    await act(async () => fireEvent.press(screen.getByLabelText('One week more')));
    await act(async () => fireEvent.press(screen.getByLabelText('4')));
    await act(async () => fireEvent.press(screen.getByLabelText('Home')));
    await act(async () => fireEvent.press(screen.getByTestId('setup-next')));
    await act(async () => fireEvent.press(screen.getByLabelText('Dumbbells')));
    await act(async () => fireEvent.press(screen.getByTestId('setup-next')));
    await act(async () => fireEvent.press(screen.getByTestId('setup-next')));
    expect(screen.getByText('Your plan is ready')).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByTestId('setup-next')));
    await act(async () => fireEvent.press(screen.getByTestId('setup-next')));
    expect(store.getState().plan).toMatchObject({ style: 'women', experience: 'new', days: 4, where: 'home', home: ['dumbbells'], length: { kind: 'weeks', weeks: 11 } });
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('changing the plan starts from the current answers, past the welcome', async () => {
    const { store } = setup();
    store.getState().setPlan({ ...PLAN, length: { kind: 'weeks', weeks: 9 }, days: 4 });
    await render(<BaseProvider store={store}><Setup now={() => T0} /></BaseProvider>);
    expect(screen.getByText('Which plan fits you?')).toBeTruthy();
    expect(screen.getByLabelText(/^Men's plan/)).toBeSelected();
    await act(async () => fireEvent.press(screen.getByTestId('setup-next')));
    await act(async () => fireEvent.press(screen.getByTestId('setup-next')));
    expect(screen.getByTestId('custom-weeks')).toHaveTextContent('9 weeks');
    expect(screen.getByLabelText('4')).toBeSelected();
    await act(async () => fireEvent.press(screen.getByTestId('setup-next')));
    await act(async () => fireEvent.press(screen.getByTestId('setup-next')));
    await act(async () => fireEvent.press(screen.getByTestId('setup-next')));
    await act(async () => fireEvent.press(screen.getByTestId('setup-next')));
    await act(async () => fireEvent.press(screen.getByTestId('setup-next')));
    expect(store.getState().plan).toMatchObject({ days: 4, startedAt: PLAN.startedAt, length: { kind: 'weeks', weeks: 9 } });
  });

  it('Today shows the next workout, the chapter and asks for food targets', async () => {
    const { store } = setup();
    store.getState().setPlan(PLAN);
    await render(<BaseProvider store={store}><Today now={T0} /></BaseProvider>);
    expect(screen.getByText('Workout A')).toBeTruthy();
    expect(screen.getByText('0 of 3 workouts this week')).toBeTruthy();
    expect(screen.getByText('Set your daily targets')).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByTestId('today-start')));
    expect(router.push).toHaveBeenCalledWith('/workout');
    expect(screen.queryByText(/^Done today/)).toBeNull();
  });

  it('Today says a workout was done today, and the next one waits', async () => {
    let now = T0;
    const { store } = setup(() => now);
    store.getState().setPlan({ ...PLAN, startedAt: T0 - 1 });
    store.getState().startWorkout();
    store.getState().toggleSet(0, 0);
    store.getState().toggleSet(0, 1);
    now += 60 * 60_000;
    store.getState().finishWorkout();
    await render(<BaseProvider store={store}><Today now={now} /></BaseProvider>);
    expect(screen.getByText('Done today: Workout A, 2 sets. Rest well.')).toBeTruthy();
    expect(screen.getByText('Workout B')).toBeTruthy();
  });

  it('the workout log: ticking a set starts the rest, finishing shows the summary', async () => {
    const { store } = setup(() => Date.now());
    store.getState().setPlan(PLAN);
    store.getState().startWorkout();
    await render(<BaseProvider store={store}><Workout /></BaseProvider>);
    await act(async () => fireEvent.changeText(screen.getByTestId('w-0-0'), '..'));
    expect(store.getState().active!.exercises[0]!.sets[0]!.weight).toBeNull();
    await act(async () => fireEvent.changeText(screen.getByTestId('w-0-0'), '42,5'));
    expect(store.getState().active!.exercises[0]!.sets[0]!.weight).toBe(42.5);
    await act(async () => fireEvent.changeText(screen.getByTestId('w-0-0'), '42.5'));
    await act(async () => fireEvent.press(screen.getByTestId('done-0-0')));
    expect(store.getState().active!.exercises[0]!.sets[0]).toMatchObject({ weight: 42.5, done: true });
    expect(store.getState().restUntil).not.toBeNull();
    expect(screen.getByText(/^Rest /)).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByTestId('finish')));
    await act(async () => fireEvent.press(screen.getByTestId('finish-yes')));
    expect(screen.getByText('Workout done')).toBeTruthy();
    expect(store.getState().workouts).toHaveLength(1);
  });

  it('an exercise page shows how to do it, the best set and past workouts', async () => {
    const { store } = setup();
    store.setState({ workouts: [
      { id: 'w1', startedAt: T0, finishedAt: T0 + 1, day: 0, week: 1, blockWeek: 1, place: 'gym', exercises: [{ slot: 'squat', move: 'goblet-squat', target: { kind: 'range', min: 8, max: 12, unit: 'reps' }, restSeconds: 150, sets: [{ weight: 20, reps: 10, done: true }] }] },
      { id: 'w2', startedAt: T0 + 2, finishedAt: T0 + 3, day: 0, week: 2, blockWeek: 2, place: 'gym', exercises: [{ slot: 'squat', move: 'goblet-squat', target: { kind: 'range', min: 8, max: 12, unit: 'reps' }, restSeconds: 150, sets: [{ weight: 22.5, reps: 9, done: true }] }] },
    ] });
    await render(<BaseProvider store={store}><Exercise id="goblet-squat" /></BaseProvider>);
    expect(screen.getByText('How to do it')).toBeTruthy();
    expect(screen.getByText('Best set: 22.5 kg × 9')).toBeTruthy();
    expect(screen.getByLabelText('Your top set over the last 2 workouts, best 22.5 kg × 9')).toBeTruthy();
  });

  it('logging food asks for a number, names a nameless one Quick add, then saves', async () => {
    const { store } = setup();
    await render(<BaseProvider store={store}><FoodAdd /></BaseProvider>);
    await act(async () => fireEvent.press(screen.getByTestId('food-save')));
    expect(screen.getByText('Add the calories, or the protein.')).toBeTruthy();
    await act(async () => fireEvent.changeText(screen.getByTestId('food-kcal'), '250'));
    await act(async () => fireEvent.press(screen.getByTestId('food-save')));
    expect(store.getState().food[0]).toMatchObject({ name: 'Quick add', kcal: 250 });
    await act(async () => fireEvent.changeText(screen.getByTestId('food-name'), 'Two eggs'));
    await act(async () => fireEvent.changeText(screen.getByTestId('food-protein'), '12'));
    await act(async () => fireEvent.press(screen.getByTestId('food-save')));
    expect(store.getState().food[1]).toMatchObject({ name: 'Two eggs', protein: 12, kcal: 250 });
    expect(router.back).toHaveBeenCalled();
  });
});
